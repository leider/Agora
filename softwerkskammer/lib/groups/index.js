"use strict";
const conf = require("simple-configure");
const R = require("ramda");
const Feed = require("feed").Feed;

const misc = require("../commons/misc");
const groupsService = require("./groupsService");
const groupstore = require("./groupstore");
const wikiService = require("../wiki/wikiService");
const Group = require("./group");
const groupsAndMembers = require("../groupsAndMembers/groupsAndMembersService");
const meetupActivitiesService = require("../meetupActivities/meetupActivitiesService");
const activitystore = require("../activities/activitystore");
const statusmessage = require("../commons/statusmessage");

const app = misc.expressAppIn(__dirname);

function groupSubmitted(req, res) {
  const group = new Group(req.body);
  const errors = groupsService.isGroupValid(group);
  if (errors.length !== 0) {
    return res.render("../../../views/errorPages/validationError", { errors });
  }
  const existingGroup = groupstore.getGroup(group.id);
  if (!existingGroup) {
    group.subscribe(req.user.member);
  } else {
    group.subscribedMembers = existingGroup.subscribedMembers;
  }
  groupstore.saveGroup(group);
  statusmessage.successMessage("message.title.save_successful", "message.content.groups.saved").putIntoSession(req);
  res.redirect(`/groups/${group.id}`);
}

// display all groups
app.get("/", (req, res) => {
  const groups = groupstore.allGroups();
  res.render("index", {
    regionalgroups: Group.regionalsFrom(groups),
    themegroups: Group.thematicsFrom(groups),
  });
});

app.get("/new", (req, res) => {
  res.render("edit", {
    group: new Group(),
    allTypes: Group.allTypes(),
    organizersChecked: [{ member: req.user.member, checked: true }],
  });
});

app.post("/submit", (req, res, next) => groupSubmitted(req, res, next));

// the parameterized routes must come after the fixed ones!

app.get("/edit/:groupname", async (req, res) => {
  const group = await groupsAndMembers.getGroupAndMembersForListWithAvatar(req.params.groupname);
  if (!group) {
    throw new Error();
  }
  if (!res.locals.accessrights.canEditGroup(group)) {
    return res.redirect(`/groups/${encodeURIComponent(req.params.groupname)}`);
  }
  const realGroup = group || new Group();
  const organizersChecked = realGroup.checkedOrganizers(realGroup.members);
  res.render("edit", { group: realGroup, allTypes: Group.allTypes(), organizersChecked });
});

app.post("/clone-from-meetup-for-group", async (req, res) => {
  const group = groupstore.getGroup(req.body.groupname);
  await meetupActivitiesService.cloneActivitiesFromMeetupForGroup(group);
  res.redirect(`/groups/${req.body.groupname}`);
});

app.get("/checkgroupname", (req, res) => {
  const result = misc.validate(req.query.id, null, groupsService.isGroupNameAvailable);
  res.end(result);
});

app.get("/checkemailprefix", (req, res) => {
  const result = misc.validate(req.query.emailPrefix, null, groupsService.isEmailPrefixAvailable);
  res.end(result);
});

app.post("/subscribe", (req, res) => {
  try {
    groupsService.addMemberToGroupNamed(req.user.member, req.body.groupname);
    statusmessage
      .successMessage("message.title.save_successful", "message.content.groups.subscribed")
      .putIntoSession(req);
  } catch (err) {
    statusmessage
      .errorMessage("message.title.problem", "message.content.save_error_reason", { err: err.toString() })
      .putIntoSession(req);
  }
  res.redirect(`/groups/${req.body.groupname}`);
});

app.post("/unsubscribe", (req, res) => {
  try {
    groupsService.removeMemberFromGroupNamed(req.user.member, req.body.groupname);
    statusmessage
      .successMessage("message.title.save_successful", "message.content.groups.unsubscribed")
      .putIntoSession(req);
  } catch (err) {
    statusmessage
      .errorMessage("message.title.problem", "message.content.save_error_reason", { err: err.toString() })
      .putIntoSession(req);
  }
  res.redirect(`/groups/${req.body.groupname}`);
});

app.get("/:groupname", async (req, res, next) => {
  function addGroupDataToActivity(activities, group) {
    activities.forEach((activity) => {
      activity.colorRGB = group.color;
      activity.group = group; // sets the group object in activity
    });
    return activities;
  }

  const group = await groupsAndMembers.getGroupAndMembersForListWithAvatar(req.params.groupname);
  if (!group) {
    return next();
  }
  const blogposts = await wikiService.getBlogpostsForGroup(req.params.groupname);
  const activities = activitystore.upcomingActivitiesForGroupIds([group.id]);
  const pastActivities = activitystore.pastActivitiesForGroupIds([group.id]);
  const registeredUserId = req && req.user ? req.user.member.id() : undefined;
  res.render("get", {
    group,
    users: group.members,
    userIsGroupMember: registeredUserId && group.isMemberSubscribed(req.user.member),
    organizers: group.organizers,
    blogposts,
    blogpostsFeedUrl: `${req.originalUrl}/feed`,
    webcalURL: `${conf.get("publicUrlPrefix").replace("http", "webcal")}/activities/icalForGroup/${group.id}`,
    upcomingGroupActivities: addGroupDataToActivity(activities, group) || [],
    recentGroupActivities: addGroupDataToActivity(pastActivities ? R.take(5, pastActivities) : [], group),
  });
});

app.get("/:groupname/feed", async (req, res, next) => {
  const group = groupsAndMembers.getGroupAndMembersForList(req.params.groupname);
  if (!group) {
    return next();
  }
  const blogposts = await wikiService.getBlogpostsForGroup(req.params.groupname);

  const updated = blogposts.length > 0 ? blogposts[0].date().toJSDate() : undefined;
  const baseUrl = conf.get("publicUrlPrefix");

  const feed = new Feed({
    id: baseUrl + req.originalUrl,
    title: [res.locals.siteTitle, group.longName, req.i18n.t("wiki.blogposts")].join(" - "),
    favicon: baseUrl + "/favicon.ico",
    image: baseUrl + res.locals.siteLogoPath,
    updated: updated,
    generator: "Agora",
  });

  blogposts.forEach((post) => {
    feed.addItem({
      title: post.title,
      id: post.name,
      link: baseUrl + post.url(),
      content: post.renderBody(),
      date: post.date().toJSDate(),
    });
  });

  res.type("application/atom+xml");
  res.send(feed.atom1());
});

module.exports = app;
