"use strict";

require("../../testutil/configureForTest");

const sinon = require("sinon").createSandbox();
const expect = require("must-dist");

const activitystore = require("../../lib/activities/activitystore");
const persistence = require("../../lib/activities/activitiesPersistence");
const Activity = require("../../lib/activities/activity");

describe("Activity application with DB - shows activities for Group-Ids -", () => {
  const tomorrowEarly = new Date(Date.now() + 86400000); // + 1 day
  const tomorrowLate = new Date(Date.now() + 90000000); // + 1 day + 1 hour
  const dayAfterTomorrow = new Date(Date.now() + 86400000 + 86400000); // + 2 days
  const yesterday = new Date(Date.now() - 86400000); // - 1 day
  const dayBeforeYesterday = new Date(Date.now() - 86400000 - 86400000); // - 2 days
  const threeDaysAgo = new Date(Date.now() - 86400000 - 86400000 - 86400000); // - 3 days

  const futureActivity1 = new Activity({
    id: "futureActivity1",
    title: "Future Activity 1",
    description: "description1",
    assignedGroup: "groupname1",
    location: "location1",
    direction: "direction1",
    startDate: tomorrowEarly,
    endDate: dayAfterTomorrow,
    url: "url_future",
    owner: "owner",
    resources: {
      Veranstaltung: { _registeredMembers: [{ memberId: "memberId2" }], _registrationOpen: true },
      AndereVeranstaltung: { _registeredMembers: [{ memberId: "memberId2" }], _registrationOpen: true },
    },
    version: 1,
  });
  const futureActivity2 = new Activity({
    id: "futureActivity2",
    title: "Future Activity 2",
    description: "description1",
    assignedGroup: "groupname2",
    location: "location1",
    direction: "direction1",
    startDate: tomorrowLate,
    endDate: dayAfterTomorrow,
    url: "url_future",
    owner: "owner",
    resources: { Veranstaltung: { _registeredMembers: [{ memberId: "memberId" }], _registrationOpen: true } },
    version: 1,
  });

  const currentActivity1 = new Activity({
    id: "currentActivity1",
    title: "Current Activity 1",
    description: "description1",
    assignedGroup: "groupname1",
    location: "location1",
    direction: "direction1",
    startDate: yesterday,
    endDate: tomorrowEarly,
    url: "url_current",
    owner: "owner",
    resources: { Veranstaltung: { _registeredMembers: [{ memberId: "memberId" }], _registrationOpen: true } },
    version: 1,
  });
  const currentActivity2 = new Activity({
    id: "currentActivity2",
    title: "Current Activity 2",
    description: "description1",
    assignedGroup: "groupname2",
    location: "location1",
    direction: "direction1",
    startDate: yesterday,
    endDate: tomorrowEarly,
    url: "url_current",
    owner: "owner",
    resources: { Veranstaltung: {} },
    version: 1,
  }); // resource has no registered members!

  const pastActivity1 = new Activity({
    id: "pastActivity1",
    title: "Past Activity 1",
    description: "description1",
    assignedGroup: "groupname",
    location: "location1",
    direction: "direction1",
    startDate: dayBeforeYesterday,
    endDate: yesterday,
    url: "url_past",
    owner: "owner",
    resources: { Veranstaltung: { _registeredMembers: [{ memberId: "memberId" }], _registrationOpen: true } },
    version: 1,
  });

  const pastActivity2 = new Activity({
    id: "pastActivity2",
    title: "Past Activity 2",
    description: "description1",
    assignedGroup: "groupname",
    location: "location1",
    direction: "direction1",
    startDate: threeDaysAgo,
    endDate: threeDaysAgo,
    url: "url_past",
    owner: "owner",
    resources: { Veranstaltung: { _registeredMembers: [{ memberId: "memberId" }], _registrationOpen: true } },
    version: 1,
  });

  beforeEach(() => {
    // if this fails, you need to start your mongo DB
    persistence.recreateForTest();
    activitystore.saveActivity(pastActivity1);
    activitystore.saveActivity(pastActivity2);
    activitystore.saveActivity(futureActivity1);
    activitystore.saveActivity(futureActivity2);
    activitystore.saveActivity(currentActivity1);
    activitystore.saveActivity(currentActivity2);
  });

  afterEach(() => {
    sinon.restore();
  });

  it("shows only current and future activities of Group 1", () => {
    const activities = activitystore.upcomingActivitiesForGroupIds(["groupname1"]);
    expect(activities.length).to.equal(2);
    expect(activities[0].title()).to.equal("Current Activity 1");
    expect(activities[1].title()).to.equal("Future Activity 1");
  });

  it("shows current and future activities of Group 1 and activities with subscribed member", () => {
    const activities = activitystore.activitiesForGroupIdsAndRegisteredMemberId(["groupname1"], "memberId", true);
    expect(activities.length).to.equal(3);
    expect(activities[0].title()).to.equal("Current Activity 1");
    expect(activities[1].title()).to.equal("Future Activity 1");
    expect(activities[2].title()).to.equal("Future Activity 2");
  });

  it("shows activity only once even if member is subscribed to multiple resources", () => {
    const activities = activitystore.activitiesForGroupIdsAndRegisteredMemberId([], "memberId2", true);
    expect(activities.length).to.equal(1);
    expect(activities[0].title()).to.equal("Future Activity 1");
  });

  it("shows past activities of Group 1 and activities with subscribed member (current is included)", () => {
    const activities = activitystore.activitiesForGroupIdsAndRegisteredMemberId(["groupname1"], "memberId", false);
    expect(activities.length).to.equal(3);
    expect(activities[0].title()).to.equal("Current Activity 1");
    expect(activities[1].title()).to.equal("Past Activity 1");
    expect(activities[2].title()).to.equal("Past Activity 2");
  });

  it("shows current and future activities of activities with subscribed member", () => {
    const activities = activitystore.activitiesForGroupIdsAndRegisteredMemberId([], "memberId", true);
    expect(activities.length).to.equal(2);
    expect(activities[0].title()).to.equal("Current Activity 1");
    expect(activities[1].title()).to.equal("Future Activity 2");
  });

  it("returns an empty list if no matching activities are found", () => {
    const activities = activitystore.activitiesForGroupIdsAndRegisteredMemberId([], "unknownMemberId", true);
    expect(activities.length).to.equal(0);
  });
});

describe("Activity application with DB - activitiesForGroupIdsAndRegisteredMemberId without activities -", () => {
  beforeEach(() => {
    // if this fails, you need to start your mongo DB
    persistence.recreateForTest();
  });

  it("returns an empty list if there is no collection at all", () => {
    const activities = activitystore.activitiesForGroupIdsAndRegisteredMemberId([], "unknownMemberId", true);
    expect(activities.length).to.equal(0);
  });
});
