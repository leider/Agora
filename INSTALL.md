# System requirements and Installation

## Node.js

It is a node.js project. Therefore you need node.js installed. Get it from [http://nodejs.org](http://nodejs.org).

You need a current > 8.x version to run the software.

Your node.js ships npm in a suitable version.

## Additional Software

Some modules are compiled during the installation. Therefore some additional software must be installed.

On Mac OS you can use Homebrew (https://brew.sh/) to install binary dependencies.

On Windows there are currently issues when running the tests:

- most tests that verify pathnames will fail because of the `\` used by Windows as a separator

### Git

- Git must be in the system path.

  brew install git

### MongoDB

- Install MongoDB (Version 2.4 or greater) [http://www.mongodb.org/downloads](http://www.mongodb.org/downloads)
- Install and run mongodb (with default settings, i.e. no security - definitely do not do this in production!):

```
    brew install mongodb
    sudo mkdir -p /data/db
    sudo chown 777 /data/db
    mongod
```

#### Useful commands

1. `mongo swk` to connect to the database
1. `db.memberstore.find().pretty()` to prettry print the content of `memberstore`
1. `db.groupstore.update( { _id : ObjectId("5bf9d641b68a0cb25fa4515c") }, { $unset: {contactingOrganizersEnabled: ""} } );` to remove property `contactingOrganizersEnabled` from the group with id `ObjectId("5bf9d641b68a0cb25fa4515c")`

### Grunt-CLI

We propose to install grunt-cli globally via the -g option of npm. To find out more about this option, see [https://npmjs.org/doc/global.html](https://npmjs.org/doc/global.html).:

- (Optional) To define the installation location of global npm packages on Unix-like Systems create a file called `.npmrc` with the following contents in your Home directory:

        prefix=GLOBALPATH
        umask=077

- Anywhere, invoke `npm install -g grunt-cli` or `sudo npm install -g grunt-cli` if you don't have sufficient user privileges. You can check the installation with `which grunt`. If a location is returned everything is fine.
- (Optional) If the directory `GLOBALPATH/bin` is not in your path (you can check with `echo $PATH`), you need to add it to the path: In your Home directory, create or edit the file `.profile` and add the following line:

        export PATH=GLOBALPATH/bin/:$PATH

### Shell for `npm install`

- You need a shell (a.k.a. command line window) that is able to access the stuff you just installed.

## Preparations for use

- Check out this project into some folder (let's call it _REPO_ from now on)
- Open a shell as described above and go to _REPO_
- Run `npm install`
- Start mongodb. If you only plan to use it for development, the default settings are ok. The app as well as the tests use these defaults if you did not change the configuration.
- (Optional) Instructions for authenticated use are [here](softwerkskammer/lib/persistence/README.md)

### The built-in wiki

To set up the built-in wiki follow [these instructions for Softwerkskammer](softwerkskammer/lib/wiki/README.md)

### Configuring the server

Configuration for Softwerkskammer:

- Copy the logging configuration file `config-examples/winston-config.json` to `config/winston-config.json`, and adapt the paths if you like.
- Copy the mailsender configuration file `config-examples/mailsender-config.json` to `config/mailsender-config.json`. Without setting up a proper server sending mails won't work but this configuration is sufficient to be able to start the softwerkskammer app.

#### Internationalization for DateTime (Luxon)

Please see the node section install instructions on https://moment.github.io/luxon/docs/manual/install.html

##### Shortly:

Be sure to have node started with either an ENV like `NODE_ICU_DATA="$(pwd)/node_modules/full-icu"`
or a startup parameter like `--icu-data-dir=./node_modules/full-icu`

If you use the run scripts inside WebStorm it is save (they set the parameter where needed).

#### Mailserver settings

if you want to be able to send mails, you need to configure the mail sender. One way to achieve a running configuration
is to use a mail server you have access to. The configuration should look like this:

###### config/mailsender-config.json

<pre><code>
{
 "transport-options": {
   "host": "server host name e.g. smtp.yourdomain.com",
   "port": the port you use to connect to the server to send mails e.g. 25 or 465,
   "secure": false,
   "auth": {
     "user": "the user to log in to your mail server",
     "pass": "the password"
   },
   "debug": "true",
   "tls": {
     "rejectUnauthorized": false
   }
 },
 "sender-name": "Softwerkskammer Benachrichtigungen",
 "sender-address": "mail address to send from"
}
</code></pre>

### Running the server

- Open a shell in _REPO_
- If your installation is fresh, run the db initialization script:
  - In any case, run `node softwerkskammer/initialDBSetup`
- If your installation is fresh or you changed anything:
  - Run `npm test` (this creates the CSS files and other static contents and performs eslint checking)

Now you can start Softwerkskammer:

- `node start-softwerkskammer` - will start the server
- Now go to your local machine, open a browser and use `http://localhost:17124`
- The port `17124` is the default and can be changed via the command line option `--port` or via the environment option 'port' to any desired value
- If your installation is fresh, you should create an account for yourself by registering.
  - The default setup assumes you are running on localhost for authentication. If you are using a different hostname, you have to edit the configuration file `config-examples/server-config.json`. Follow the instructions in there.

### Full Access to the Applications

Not all features can be accessed without login. Some can only be accessed when you are superuser.

Access for Softwerkskammer:

- Log in to the application. Be aware that Google and Github cannot be used out of the box. Therefore, you should use an OpenID provider such as Stack Exchange, XLogon (https://my.xlogon.net/)
  or you can choose one from this list: http://openid.net/get-an-openid/

- To access certain admin features, you may want to become superuser. This step will make you superuser of both applications at once.
  In order to do this, open `mongo swk`, display all member information via `db.memberstore.find().pretty()` and search for your entry. Select the string after `id`, create a copy of `config-examples/authentication-config.json`
  and add your id to the `superuser` array.
