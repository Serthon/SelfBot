var ConfigFile = require("../config.json"),
  Logger = require("./logger.js").Logger,
  Permissions = require("./permissions.js"),
  imgDirectory = require("../config.json").image_folder,
  Giphy = require("./giphy.js"),
  Cleverbot = require('cleverbot-node'),
  cleverbot = new Cleverbot(),
  yt = require("./youtube_plugin"),
  Customize = require('./customization.js'),
  youtube_plugin = new yt(),
  version = require("../package.json").version,
  unirest = require('unirest'),
  Debug = require("./debugging.js"),
  DJ = require("./djlogic.js"),
  aliases = require("./alias.json");

var Commands = [];

Commands.ping = {
  name: "ping",
  help: "I'll reply to you with pong!",
  module: "default",
  timeout: 10,
  level: 0,
  fn: function(bot, msg) {
    bot.reply(msg, "Pong!"); // Easy for moderation
  }
};

Commands.shrug = {
	name: "shrug",
	help: "non of u beezwax!",
	level: 0,
	fn: function(bot, msg) {
		bot.updateMessage(msg, msg.content.replace("shrug", "¯\\\_(ツ)_/¯"));
	}
}

Commands.ok = {
	name: "ok",
	help: "non of u beezwax!",
	level: 0,
	fn: function(bot, msg) {
		bot.updateMessage(msg, msg.content.replace("ok", ":ok_hand::skin-tone-3:"));
	}
}

Commands.lenny = {
	name: "lenny",
	help: "non of u beezwax!",
	level: 0,
	fn: function(bot, msg) {
		bot.updateMessage(msg, msg.content.replace("lenny", "( ͡° ͜ʖ ͡°)"));
	}
}

Commands.wutface = {
	name: "wutface",
	help: "non of u beezwax!",
	level: 0,
	fn: function(bot, msg) {
		bot.updateMessage(msg, msg.content.replace("wutface", "ಠ_ಠ"));
	}
}

Commands.yes = {
	name: "yes",
	help: "non of u beezwax!",
	level: 0,
	fn: function(bot, msg) {
		bot.updateMessage(msg, msg.content.replace("yes", ":thumbsup::skin-tone-3:"));
	}
}

Commands.no = {
	name: "no",
	help: "non of u beezwax!",
	level: 0,
	fn: function(bot, msg) {
		bot.updateMessage(msg, msg.content.replace("no", ":thumbsdown::skin-tone-3:"));
	}
}

Commands.eval = { // TODO: Allow newlines
  name: "eval",
  help: "Allows the execution of arbitrary Javascript code within the context of the bot.",
  module: "default",
  level: 6, // Now 100% sure it can't be used by anyone but the master user.
  fn: function(bot, msg, suffix) {
    try {
      bot.sendMessage(msg.channel, eval(suffix));
    } catch (err) {
      var banter = ["That almost killed me!", "You're doing it wrong!", "You're not very good at this, are you.", "Try again, better this time.", "I'm not pleased with your JavaScript skills.", "Whoops...", "We got an error cap'n!", "I'm sorry, but I can't let you do that."];
      var rand = Math.round((Math.random() * banter.length));
      var arr = [];
      arr.push("**" + banter[rand] + "**");
      arr.push("```" + err + "```");
      bot.sendMessage(msg.channel, arr);
    }
  }
};

Commands.alias = { // IDEA: Maybe unlock this to all users?
  name: "alias",
  help: "Allows for creating quick custom commands on the fly!",
  module: "default",
  level: 5,
  fn: function(bot, msg, suffix) {
    var args = suffix.split(" ");
    var name = args.shift();
    if (!name) {
      return;
    } else if (Commands[name] || name === "help") {
      bot.sendMessage(msg.channel, "Overwriting commands with aliases is not allowed!");
    } else {
      var command = args.shift();
      aliases[name] = [command, args.join(" ")];
      //now save the new alias
      require("fs").writeFile("./runtime/alias.json", JSON.stringify(aliases, null, 2), null);
      bot.sendMessage(msg.channel, "Created alias " + name);
    }
  }
};

Commands.setstatus = {
  name: "setstatus",
  help: "This will change my current status to something else.",
  module: "default",
  usage: "<online / away> [playing status]",
  level: 5,
  fn: function(bot, msg, suffix) {
    var step = suffix.split(" "),
      status = step[0],
      playingstep = step.slice(1, step.length),
      playing = playingstep.join(" ");
    if (!suffix) {
      bot.sendMessage(msg.channel, "You need a suffix, dummy!");
      return;
    }
    if (status === "online" || status === "away") {
      bot.setStatus(status, playing, function(error) {
        if (error) {
          bot.sendMessage(msg.channel, "Whoops, that doesn't work, try again.");
        } else if (playing) {
          bot.sendMessage(msg.channel, "Okay, I'm now " + status + " and playing " + playing);
        } else {
          bot.sendMessage(msg.channel, "Okay, I'm now " + status + ".");
        }
      });
    } else {
      bot.sendMessage(msg.channel, "I can only be `online` or `away`!");
      return;
    }
  }
};

Commands.leetspeak = {
  name: "leetspeak",
  help: "1'Ll 3nc0D3 Y0uR Me5s@g3 1Nt0 l337sp3@K!",
  module: "fun",
  level: 0,
  fn: function(bot, msg, suffix) {
    if (suffix.length > 0) {
      var leetspeak = require("leetspeak");
      var thing = leetspeak(suffix);
      bot.reply(msg, thing);
    } else {
      bot.reply(msg, "*You need to type something to encode your message into l337sp3@K!*");
    }
  }
};

Commands.randomcat = {
  name: "randomcat",
  help: "I'll get a random cat image for you!",
  module: "fun",
  timeout: 10,
  level: 0,
  fn: function(bot, msg, suffix) {
    bot.startTyping(msg.channel);
    unirest.get("https://nijikokun-random-cats.p.mashape.com/random")
      .header("X-Mashape-Key", ConfigFile.api_keys.mashape_key)
      .header("Accept", "application/json")
      .end(function(result) {
        bot.reply(msg, result.body.source);
        bot.stopTyping(msg.channel);
      });
  }
};

Commands.customize = {
  name: "customize",
  help: "Change almost everything about my behaviour in this server!",
  module: "default",
  usage: "<method> <change_to>",
  methods: ["welcoming", "welcome_message", "no_permission_response", "nsfw_disallowed_response"],
  vars: ["%user", "%channel", "%server"],
  level: 3,
  fn: function(bot, msg, suffix) {
    if (msg.channel.isPrivate) {
      bot.sendMessage(msg.channel, "You can't use this in DM, dummy!");
      return;
    }
    if (this.methods.indexOf(suffix[0] > -1)) {
      if (suffix[0] === 'welcoming' && suffix[1] != 'on' && suffix[1] != 'off') {
        bot.sendMessage(msg.channel, "Welcoming can either be `on` or `off`!");
        return;
      }
      Customize.handle(suffix, msg.channel.server).then(function(reply) {
        bot.sendMessage(msg, "Successfully saved customization settings!");
      }).catch(function(err) {
        if (err === 'Not supported!') {
          bot.reply(msg, "I don't support that!");
        } else {
          bot.sendMessage(msg, "Something went wrong, try again.");
        }
      });
    } else {
      bot.reply(msg, "I don't support that!");
    }
  }
};

Commands.info = {
  name: "info",
  help: "I'll print some information about me.",
  module: "default",
  timeout: 5,
  level: 0,
  fn: function(bot, msg) {
    var msgArray = [];
    msgArray.push("**WildBeast version " + version + "**");
    msgArray.push("Using latest 6.x.x *Discord.js* version by *hydrabolt*.");
    msgArray.push("Made primarily by Dougley, Mirrow and Perpetucake.");
    bot.sendMessage(msg.channel, msgArray);
  }
};

Commands.cleverbot = { // TODO: Not good enough, conversations are not saved and are reset each time this command is executed, so conversations get off-topic really fast
  name: "cleverbot",
  help: "I'll act as Cleverbot when you execute this command, remember to enter a message as suffix.",
  module: "fun",
  usage: "<message>",
  level: 0,
  fn: function(bot, msg, suffix) {
    Cleverbot.prepare(function() {
      bot.startTyping(msg.channel);
      cleverbot.write(suffix, function(response) {
        bot.reply(msg, response.message);
        bot.stopTyping(msg.channel);
      });
    });
  }
};

Commands.say = {
  name: "say",
  help: "I'll echo the suffix of the command to the channel and, if I have sufficient permissions, I will delete the command.",
  module: "fun",
  usage: "<text>",
  timeout: 10,
  level: 0,
  fn: function(bot, msg, suffix) {
    if (suffix.indexOf(ConfigFile.bot_settings.cmd_prefix + "say") === -1) {
      bot.sendMessage(msg.channel, "\u200B" + suffix);
    } else {
      bot.sendMessage(msg.channel, "HEY " + msg.sender + " STOP THAT!", {
        tts: "true"
      });
    }
  }
};

Commands.killitbeforeitspreads = {
  name: "killitbeforeitspreads",
  help: "This will instantly terminate all of the running instances of the bot without restarting.",
  module: "default",
  level: 5, // If an access level is set to 4 or higher, only the master user can use this
  fn: function(bot, msg) {
      bot.sendMessage(msg.channel, "An admin has requested to kill all instances of WildBeast, exiting...");
      bot.logout();
      Logger.log("warn", "Disconnected via killswitch!");
      process.exit(0);
    } //exit node.js without an error
};

Commands.image = {
  name: "image",
  help: "I'll search teh interwebz for a picture matching your tags.",
  module: "fun",
  timeout: 20,
  usage: "<image tags>",
  level: 0,
  fn: function(bot, msg, suffix) {
    if (!ConfigFile || !ConfigFile.api_keys.google_key || !ConfigFile.api_keys.cse_key) {
      bot.sendMessage(msg.channel, "Image search requires **both** a Google API key and a CSE key!");
      return;
    }
    //gets us a random result in first 5 pages
    var page = 1 + Math.floor(Math.random() * 5) * 10; //we request 10 items
    var request = require("request");
    request("https://www.googleapis.com/customsearch/v1?key=" + ConfigFile.api_keys.google_key + "&cx=" + ConfigFile.api_keys.cse_key + "&q=" + (suffix.replace(/\s/g, '+')) + "&searchType=image&alt=json&num=10&start=" + page, function(err, res, body) {
      var data, error;
      try {
        data = JSON.parse(body);
      } catch (e) {
        Logger.error(e);
        bot.sendMessage(msg.channel, "The API returned an unconventional response.");
        return;
      }
      if (!data) {
        Logger.debug(data);
        bot.sendMessage(msg.channel, "Error:\n" + JSON.stringify(data));
        return;
      } else if (!data.items || data.items.length === 0) {
        Logger.debug(data);
        bot.sendMessage(msg.channel, "No result for '" + suffix + "'");
        return;
      }
      var randResult = data.items[Math.floor(Math.random() * data.items.length)];
      bot.sendMessage(msg.channel, randResult.title + '\n' + randResult.link);
    });
    Logger.log("debug", "I've looked for images of " + suffix + " for " + msg.sender.username);
  }
};

Commands.pullanddeploy = {
  name: "pullanddeploy",
  help: "I'll check if my code is up-to-date with the code from <@107904023901777920>, and restart. **Please note that this does NOT work on Windows!**", // Does it really not work on Windows, or is it tied in with Git?
  module: "admin",
  level: 5, // If an access level is set to 4 or higher, only the master user can use this
  fn: function(bot, msg, suffix) {
    bot.sendMessage(msg.channel, "Fetching updates...", function(error, sentMsg) {
      Logger.log("info", "Updating...");
      var spawn = require('child_process').spawn;
      var log = function(err, stdout, stderr) {
        if (stdout) {
          Logger.log("debug", stdout);
        }
        if (stderr) {
          Logger.log("debug", stderr);
        }
      };
      var fetch = spawn('git', ['fetch']);
      fetch.stdout.on('data', function(data) {
        Logger("debug", data.toString());
      });
      fetch.on("close", function(code) {
        var reset = spawn('git', ['reset', '--hard', 'origin/master']);
        reset.stdout.on('data', function(data) {
          Logger.log("debug", data.toString());
        });
        reset.on("close", function(code) {
          var npm = spawn('npm', ['install']);
          npm.stdout.on('data', function(data) {
            Logger.log("debug", data.toString());
          });
          npm.on("close", function(code) {
            Logger.log("info", "Goodbye");
            bot.sendMessage(msg.channel, "brb!", function() {
              bot.logout(function() {
                process.exit();
              });
            });
          });
        });
      });
    });
  }
};

Commands.youtube = {
  name: "youtube",
  help: "I'll search YouTube for a video matching your given tags.",
  module: "fun",
  usage: "<video tags>",
  level: 0,
  fn: function(bot, msg, suffix) {
    youtube_plugin.respond(suffix, msg.channel, bot);
  }
};

Commands.purge = { // TODO: Allow for tags to be used to only delete messages from those users
  name: "purge",
  help: "I'll delete a certain ammount of messages.",
  module: "admin",
  usage: "<number-of-messages-to-delete>",
  level: 2,
  fn: function(bot, msg, suffix) {
    if (!msg.channel.server) {
      bot.sendMessage(msg.channel, "You can't do that in a DM, dummy!");
      return;
    }
    if (!suffix || isNaN(suffix)) {
      bot.sendMessage(msg.channel, "Please define an ammount of messages for me to delete!");
      return;
    }
    if (!msg.channel.permissionsOf(msg.sender).hasPermission("manageMessages")) {
      bot.sendMessage(msg.channel, "Sorry, your role in this server does not have enough permissions.");
      return;
    }
    if (!msg.channel.permissionsOf(bot.user).hasPermission("manageMessages")) {
      bot.sendMessage(msg.channel, "I don't have permission to do that!");
      return;
    }
    if (suffix > 100) {
      bot.sendMessage(msg.channel, "The maximum is 100.");
      return;
    }
    bot.getChannelLogs(msg.channel, suffix, function(error, messages) {
      if (error) {
        bot.sendMessage(msg.channel, "Something went wrong while fetching logs.");
        return;
      } else {
        Logger.info("Beginning purge...");
        var todo = messages.length,
          delcount = 0;
        for (msg of messages) {
          bot.deleteMessage(msg);
          todo--;
          delcount++;
          if (todo === 0) {
            bot.sendMessage(msg.channel, "Done! Deleted " + delcount + " messages.");
            Logger.info("Ending purge, deleted " + delcount + " messages.");
            return;
          }
        }
      }
    });
  }
};

Commands.hello = {
  name: "hello",
  help: "I'll respond to you with hello along with a GitHub link, handy!",
  module: "default",
  timeout: 20,
  level: 0,
  fn: function(bot, msg) {
    bot.sendMessage(msg.channel, "Hello " + msg.sender + "! I'm " + bot.user.username + ", help me improve my contibuting to my base code: https://github.com/SteamingMutt/WildBeast");
  }
};

Commands["server-info"] = { // TODO: List roles
  name: "server-info",
  help: "I'll tell you some information about the server you're currently in.",
  module: "default",
  timeout: 20,
  level: 0,
  fn: function(bot, msg, suffix) {
    // if we're not in a PM, return some info about the channel
    if (msg.channel.server) {
      var msgArray = [];
      msgArray.push("Information requested by " + msg.sender);
      msgArray.push("Server name: **" + msg.channel.server.name + "** (id: `" + msg.channel.server.id + "`)");
      msgArray.push("Owned by **" + msg.channel.server.owner.username + "** (id: `" + msg.channel.server.owner.id + "`)");
      msgArray.push("Current region: **" + msg.channel.server.region + '**.');
      msgArray.push('This server has **' + msg.channel.server.members.length + '** members, and **' + msg.channel.server.channels.length + '** channels. (Including voice channels)');
      msgArray.push('This server has **' + msg.channel.server.roles.length + '** roles registered.');
      if (msg.channel.server.icon === null) {
        msgArray.push('No server icon present.');
      } else {
        msgArray.push('Server icon: ' + msg.channel.server.iconURL);
      }
      if (msg.channel.server.afkChannel === null) {
        msgArray.push('No voice AFK-channel present.');
      } else {
        msgArray.push('Voice AFK-channel: **' + msg.channel.server.afkChannel.name + "** (id: `" + msg.channel.server.afkChannel.id + "`)");
      }
      bot.sendMessage(msg, msgArray);
    } else {
      bot.sendMessage(msg, "You can't do that in a DM, dummy!.");
    }
  }
};

Commands.namechanges = {
  name: "namechanges",
  help: "I'll return 20 namechanges the mentioned user has done, and that I know of.",
  module: "admin",
  timeout: 10,
  level: 0,
  fn: function(bot, msg, suffix) {
    msg.mentions.map(function(user) {
      var UserDB = require('./user_nsa.js');
      UserDB.returnNamechanges(user).then(function(reply) {
        bot.sendMessage(msg.channel, reply.join(', '));
      }).catch(function(err) {
        if (err === 'No changes!') {
          bot.sendMessage(msg.channel, "I don't have any changes registered.");
          return;
        }
        bot.sendMessage(msg.channel, 'Something went wrong, try again later.');
      });
    });
  }
};

Commands["join-server"] = {
  name: "join-server",
  help: "I'll join the server you've requested me to join, as long as the invite is valid and I'm not banned of already in the requested server.",
  module: "default",
  usage: "<bot-mention> <instant-invite>",
  level: 0,
  fn: function(bot, msg, suffix) {
    if (ConfigFile.discord.token_mode === true) {
      bot.sendMessage(msg.channel, "Sorry, bot accounts can't accept instant invites, instead, use my OAuth URL: " + ConfigFile.discord.oauth_url);
      return;
    }
    if (!msg.channel.isPrivate && msg.isMentioned(bot.user)) {
      suffix = suffix.split(' ');
      Logger.log("debug", bot.joinServer(suffix[1], function(error, server) {
        Logger.log("debug", "callback: " + arguments);
        if (error || !server) {
          Logger.warn("Failed to join a server: " + error);
          bot.sendMessage(msg.channel, "Something went wrong, try again.");
        } else {
          bot.sendMessage(msg.channel, "Sucessfully joined **" + server.name + "**!");
        }
      }));
    } else if (msg.channel.isPrivate) {
      Logger.log("debug", bot.joinServer(suffix, function(error, server) {
        Logger.log("debug", "callback: " + arguments);
        if (error || !server) {
          Logger.warn("Failed to join a server: " + error);
          bot.sendMessage(msg.channel, "Something went wrong, try again.");
        } else {
          bot.sendMessage(msg.channel, "Sucessfully joined **" + server.name + "**!");
        }
      }));
    }
  }
};

Commands.meme = {
  name: "meme",
  help: "I'll create a meme with your suffixes!",
  module: "fun",
  timeout: 10,
  usage: '<memetype> "<Upper line>" "<Bottom line>" **Quotes are important!**',
  level: 0,
  fn: function(bot, msg, suffix) {
    var tags = msg.content.split('"');
    var memetype = tags[0].split(" ")[1];
    var meme = require("./memes.json");
    //bot.sendMessage(msg.channel,tags);
    var Imgflipper = require("imgflipper");
    var imgflipper = new Imgflipper(ConfigFile.imgflip.username, ConfigFile.imgflip.password);
    imgflipper.generateMeme(meme[memetype], tags[1] ? tags[1] : "", tags[3] ? tags[3] : "", function(err, image) {
      //CmdErrorLog.log("debug", arguments);
      bot.reply(msg, image);
      if (!msg.channel.server) {
        return;
      }
      var bot_permissions = msg.channel.permissionsOf(bot.user);
      if (bot_permissions.hasPermission("manageMessages")) {
        bot.deleteMessage(msg);
        return;
      } else {
        bot.sendMessage(msg.channel, "*This works best when I have the permission to delete messages!*");
      }
    });
  }
};

Commands.status = {
  name: "status",
  help: "I'll get some info about me, like uptime and currently connected servers.",
  module: "default",
  timeout: 20,
  level: 0,
  fn: function(bot, msg) {
    var msgArray = [];
    msgArray.push("Hello " + msg.sender + ", I'm " + bot.user + ", nice to meet you!");
    msgArray.push("I'm used in " + bot.servers.length + " servers, in " + bot.channels.length + " channels and by " + bot.users.length + " users.");
    msgArray.push("My uptime is " + (Math.round(bot.uptime / (1000 * 60 * 60 * 24))) + " days, " + (Math.round(bot.uptime / (1000 * 60 * 60))) + " hours, " + (Math.round(bot.uptime / (1000 * 60)) % 60) + " minutes, and " + (Math.round(bot.uptime / 1000) % 60) + " seconds.");
    bot.sendMessage(msg.channel, msgArray);
  }
};

Commands.iff = {
  name: "iff",
  help: "''**I**mage **F**rom **F**ile'', I'll get a image from the image folder for you and upload it to the channel.",
  module: "fun",
  usage: "<image>",
  timeout: 10,
  level: 0,
  fn: function(bot, msg, suffix) {
    var fs = require("fs");
    var path = require("path");
    var ext = [".jpg", ".jpeg", ".gif", ".png"];
    var imgArray = [];
    fs.readdir("./images", function(err, dirContents) {
      for (var i = 0; i < dirContents.length; i++) {
        for (var o = 0; o < ext.length; o++) {
          if (path.extname(dirContents[i]) === ext[o]) {
            imgArray.push(dirContents[i]);
          }
        }
      }
      if (imgArray.indexOf(suffix) !== -1) {
        bot.sendFile(msg.channel, "./images/" + suffix);
        if (!msg.channel.server) {
          return;
        }
        var bot_permissions = msg.channel.permissionsOf(bot.user);
        if (bot_permissions.hasPermission("manageMessages")) {
          bot.deleteMessage(msg);
          return;
        } else {
          bot.sendMessage(msg.channel, "*This works best when I have the permission to delete messages!*");
        }
      } else {
        bot.sendMessage(msg.channel, "*Invalid input!*");
      }
    });
  }
};

Commands.ban = {
  name: "ban",
  help: "Swing the banhammer on someone!",
  module: "admin",
  usage: "<user-mention>",
  level: 2,
  fn: function(bot, msg) {
    if (!msg.channel.permissionsOf(msg.sender).hasPermission("banMembers")) {
      bot.sendMessage(msg.channel, "Sorry, your role in this server does not have enough permissions.");
      return;
    }
    if (!msg.channel.permissionsOf(bot.user).hasPermission("banMembers")) {
      bot.sendMessage(msg.channel, "I don't have enough permissions to do this!");
      return;
    }
    if (msg.mentions.length === 0) {
      bot.sendMessage(msg.channel, "Please mention the user(s) you want to ban.");
      return;
    }
    msg.mentions.map(function(user) {
      bot.banMember(user.id, msg.channel.server.id, function(error) {
        if (error) {
          bot.sendMessage(msg.channel, "Failed to ban " + user);
        } else if (!error) {
          bot.sendMessage(msg.channel, "Banned " + user);
        }
      });
    });
  }
};

Commands.purgeban = {
  name: "purgeban",
  help: "Swing the banhammer and delete messages at the same time!",
  module: "admin",
  usage: "<days-to-delete> <user-mention>",
  level: 2,
  fn: function(bot, msg, suffix) {
    if (!msg.channel.permissionsOf(msg.sender).hasPermission("banMembers")) {
      bot.sendMessage(msg.channel, "Sorry, your role in this server does not have enough permissions.");
      return;
    }
    if (!msg.channel.permissionsOf(bot.user).hasPermission("banMembers")) {
      bot.sendMessage(msg.channel, "I don't have enough permissions to do this!");
      return;
    }
    if (msg.mentions.length === 0) {
      bot.sendMessage(msg.channel, "Please mention the user(s) you want to ban.");
      return;
    }
    if (isNaN(suffix[0])) {
      bot.sendMessage(msg.channel, "Your first parameter is not a number, use `ban` to ban without deleting messages.");
      return;
    }
    msg.mentions.map(function(user) {
      bot.banMember(user.id, msg.channel.server.id, suffix[0], function(error) {
        if (error) {
          bot.sendMessage(msg.channel, "Failed to ban " + user);
        } else if (!error) {
          bot.sendMessage(msg.channel, "Banned " + user + " and deleted " + suffix[0] + " days worth of messages.");
        }
      });
    });
  }
};

Commands.kick = {
  name: "kick",
  help: "Kick an user out of the server!",
  module: "admin",
  usage: "<user-mention>",
  level: 1,
  fn: function(bot, msg) {
    if (!msg.channel.permissionsOf(msg.sender).hasPermission("kickMembers")) {
      bot.sendMessage(msg.channel, "Sorry, your role in this server does not have enough permissions.");
      return;
    }
    if (!msg.channel.permissionsOf(bot.user).hasPermission("kickMembers")) {
      bot.sendMessage(msg.channel, "I don't have enough permissions to do this!");
      return;
    }
    if (msg.mentions.length === 0) {
      bot.sendMessage(msg.channel, "Please mention the user(s) you want to kick.");
      return;
    }
    msg.mentions.map(function(user) {
      bot.kickMember(user.id, msg.channel.server.id, function(error) {
        if (error) {
          bot.sendMessage(msg.channel, "Failed to kick " + user);
        } else if (!error) {
          bot.sendMessage(msg.channel, "Kicked " + user);
        }
      });
    });
  }
};

Commands.gif = {
  name: "gif",
  help: "I will search Giphy for a gif matching your tags.",
  module: "fun",
  timeout: 20,
  usage: "<image tags>",
  level: 0,
  fn: function(bot, msg, suffix) {
    var tags = suffix.split(" ");
    Giphy.get_gif(tags, function(id) {
      if (typeof id !== "undefined") {
        bot.reply(msg, "http://media.giphy.com/media/" + id + "/giphy.gif [Tags: " + (tags ? tags : "Random GIF") + "]");
      } else {
        bot.reply(msg, "sorry! Invalid tags, try something different. For example, something that exists [Tags: " + (tags ? tags : "Random GIF") + "]");
      }
    });
  }
};

Commands.imglist = {
  name: "imglist",
  help: "Prints the contents of the images directory to the channel.",
  module: "fun",
  timeout: 20,
  level: 0,
  fn: function(bot, msg) {
    var fs = require("fs");
    var path = require("path");
    var ext = [".jpg", ".jpeg", ".gif", ".png"];
    var imgArray = [];
    fs.readdir("./images", function(err, dirContents) {
      for (var i = 0; i < dirContents.length; i++) {
        for (var o = 0; o < ext.length; o++) {
          if (path.extname(dirContents[i]) === ext[o]) {
            imgArray.push(dirContents[i]);
          }
        }
      }
      bot.reply(msg, imgArray);
    });
  }
};

Commands.yomomma = {
  name: "yomomma",
  help: "I'll get a random yo momma joke for you.",
  module: "fun",
  timeout: 5,
  level: 0,
  fn: function(bot, msg, suffix) {
    var request = require('request');
    request('http://api.yomomma.info/', function(error, response, body) {
      if (!error && response.statusCode == 200) {
        try {
          JSON.parse(body);
        } catch (e) {
          bot.sendMessage(msg, 'The API returned an unconventional response.');
          return;
        }
        var yomomma = JSON.parse(body);
        if (suffix === "") {
          bot.sendMessage(msg, yomomma.joke);
          bot.deleteMessage(msg);
        } else {
          bot.sendMessage(msg, suffix + ", " + yomomma.joke);
          bot.deleteMessage(msg);
        }
      } else {
        Logger.log("warn", "Got an error: ", error, ", status code: ", response.statusCode);
      }
    });
  }
};

Commands.advice = {
  name: "advice",
  help: "I'll give you some great advice, I'm just too kind.",
  module: "fun",
  timeout: 5,
  level: 0,
  fn: function(bot, msg, suffix) {
    var request = require('request');
    request('http://api.adviceslip.com/advice', function(error, response, body) {
      if (!error && response.statusCode == 200) {
        try {
          JSON.parse(body);
        } catch (e) {
          bot.sendMessage(msg, 'The API returned an unconventional response.');
          return;
        }
        var advice = JSON.parse(body);
        bot.reply(msg, advice.slip.advice);
      } else {
        Logger.log("warn", "Got an error: ", error, ", status code: ", response.statusCode);
      }
    });
  }
};

Commands.yesno = {
  name: "yesno",
  help: "Ever wanted a gif displaying your (dis)agreement? Then look no further!",
  module: "fun",
  timeout: 5,
  usage: "optional: [force yes/no/maybe]",
  level: 0,
  fn: function(bot, msg, suffix) {
    var request = require('request');
    request('http://yesno.wtf/api/?force=' + suffix, function(error, response, body) {
      if (!error && response.statusCode == 200) {
        try {
          JSON.parse(body);
        } catch (e) {
          bot.sendMessage(msg, 'The API returned an unconventional response.');
          return;
        }
        var yesNo = JSON.parse(body);
        bot.reply(msg, yesNo.image);
      } else {
        Logger.log("warn", "Got an error: ", error, ", status code: ", response.statusCode);
      }
    });
  }
};

Commands.urbandictionary = {
  name: "urbandictionary",
  help: "Ever wanted to know what idiots on the internet thinks something means? Here ya go!",
  module: "fun",
  timeout: 10,
  usage: "[string]",
  level: 0,
  fn: function(bot, msg, suffix) {
    var request = require('request');
    request('http://api.urbandictionary.com/v0/define?term=' + suffix, function(error, response, body) {
      if (!error && response.statusCode == 200) {
        try {
          JSON.parse(body);
        } catch (e) {
          bot.sendMessage(msg, 'The API returned an unconventional response.');
          return;
        }
        var uD = JSON.parse(body);
        if (uD.result_type !== "no_results") {
          var msgArray = [];
          msgArray.push("**" + uD.list[0].word + "**");
          msgArray.push(uD.list[0].definition);
          msgArray.push('\n```');
          msgArray.push(uD.list[0].example);
          msgArray.push('```');
          bot.sendMessage(msg.channel, msgArray);
        } else {
          bot.reply(msg, suffix + ": This is so screwed up, even Urban Dictionary doesn't have it in it's database");
        }
      } else {
        Logger.log("warn", "Got an error: ", error, ", status code: ", response.statusCode);
      }
    });
  }
};

Commands.fact = {
  name: "fact",
  help: "I'll give you some interesting facts!",
  module: "fun",
  timeout: 30,
  level: 0,
  fn: function(bot, msg, suffix) {
    var request = require('request');
    var xml2js = require('xml2js');
    request("http://www.fayd.org/api/fact.xml", function(error, response, body) {
      if (!error && response.statusCode == 200) {
        //Logger.log("debug", body)
        xml2js.parseString(body, function(err, result) {
          try {
            bot.reply(msg, result.facts.fact[0]);
          } catch (e) {
            bot.sendMessage(msg.channel, "The API returned an unconventional response.");
          }
        });
      } else {
        Logger.log("warn", "Got an error: ", error, ", status code: ", response.statusCode);
      }
    });
  }
};

Commands.fancyinsult = {
  name: "fancyinsult",
  help: "I'll insult your friends, in style.",
  module: "fun",
  timeout: 5,
  level: 0,
  fn: function(bot, msg, suffix) {
    var request = require('request');
    request('http://quandyfactory.com/insult/json/', function(error, response, body) {
      if (!error && response.statusCode == 200) {
        try {
          JSON.parse(body);
        } catch (e) {
          bot.sendMessage(msg, 'The API returned an unconventional response.');
          return;
        }
        var fancyinsult = JSON.parse(body);
        if (suffix === "") {
          bot.sendMessage(msg, fancyinsult.insult);
          bot.deleteMessage(msg);
        } else {
          bot.sendMessage(msg, suffix + ", " + fancyinsult.insult);
          bot.deleteMessage(msg);
        }
      } else {
        Logger.log("warn", "Got an error: ", error, ", status code: ", response.statusCode);
      }
    });
  }
};

Commands["8ball"] = {
  name: "8ball",
  help: "I'll function as an magic 8 ball for a bit and answer all of your questions! (So long as you enter the questions as suffixes.)",
  module: "fun",
  usage: "<question>",
  level: 0,
  fn: function(bot, msg, suffix) {
    var request = require('request');
    request('https://8ball.delegator.com/magic/JSON/0', function(error, response, body) {
      if (!error && response.statusCode == 200) {
        try {
          JSON.parse(body);
        } catch (e) {
          bot.sendMessage(msg, 'The API returned an unconventional response.');
          return;
        }
        var eightBall = JSON.parse(body);
        bot.sendMessage(msg.channel, eightBall.magic.answer + ", " + msg.sender);
      } else {
        Logger.log("warn", "Got an error: ", error, ", status code: ", response.statusCode);
      }
    });
  }
};

Commands.catfacts = {
  name: "catfacts",
  help: "I'll give you some interesting facts about cats!",
  module: "fun",
  level: 0,
  fn: function(bot, msg, suffix) {
    var request = require('request');
    request('http://catfacts-api.appspot.com/api/facts', function(error, response, body) {
      if (!error && response.statusCode == 200) {
        try {
          JSON.parse(body);
        } catch (e) {
          bot.sendMessage(msg, 'The API returned an unconventional response.');
          return;
        }
        var catFact = JSON.parse(body);
        bot.reply(msg, catFact.facts[0]);
      } else {
        Logger.log("warn", "Got an error: ", error, ", status code: ", response.statusCode);
      }
    });
  }
};

Commands.help = { // IDEA: Can this be split up in categories instead of one big message?
  name: "help",
  help: "You're looking at it right now.",
  module: "default",
  level: 0,
  fn: function(bot, msg, suffix) {
    var msgArray = [];
    var commandnames = []; // Build a array of names from commands.
    if (!suffix) {
      for (var index in Commands) {
        commandnames.push(Commands[index].name);
      }
      msgArray.push("These are the currently available commands, use `" + ConfigFile.bot_settings.cmd_prefix + "help <command_name>` to learn more about a specific command.");
      msgArray.push("");
      msgArray.push(commandnames.sort().join(", ")); // Sort command names alphabetically
      msgArray.push("");
      if (ConfigFile.bot_settings.help_mode === 'private') { // Only push this if help_mode is private, as it causes unneeded pings in channel mode.
        msgArray.push("If you have any questions, or if you don't get something, contact <@107904023901777920> or <@110147170740494336>");
      }
      if (ConfigFile.bot_settings.help_mode === "private") {
        bot.sendMessage(msg.author, msgArray);
        Logger.debug("Send help via DM.");
        if (msg.channel.server) {
          bot.sendMessage(msg.channel, "Ok " + msg.author + ", I've sent you a list of commands via DM.");
        }
      } else if (ConfigFile.bot_settings.help_mode === "channel") {
        bot.sendMessage(msg.channel, msgArray);
        Logger.debug("Send help to channel.");
      } else {
        Logger.error("Config File error! Help mode is incorrectly defined!");
        bot.sendMessage(msg.channel, "Sorry, my owner didn't configure me correctly!");
      }
    }
    if (suffix) {
      if (Commands[suffix]) { // Look if suffix corresponds to a command
        var commando = Commands[suffix]; // Make a varialbe for easier calls
        msgArray = []; // Build another message array
        msgArray.push("**Command:** `" + commando.name + "`"); // Push the name of the command to the array
        msgArray.push(""); // Leave a whiteline for readability
        if (commando.hasOwnProperty("usage")) { // Push special message if command needs a suffix.
          msgArray.push("**Usage:** `" + ConfigFile.bot_settings.cmd_prefix + commando.name + " " + commando.usage + "`");
        } else {
          msgArray.push("**Usage:** `" + ConfigFile.bot_settings.cmd_prefix + commando.name + "`");
        }
        msgArray.push("**Description:** " + commando.help); // Push the extendedhelp to the array.
        if (commando.hasOwnProperty("nsfw")) { // Push special message if command is restricted.
          msgArray.push("**This command is NSFW, so it's restricted to certain channels and DM's.**");
        }
        if (commando.hasOwnProperty("timeout")) { // Push special message if command has a cooldown
          msgArray.push("**This command has a cooldown of " + commando.timeout + " seconds.**");
        }
        if (commando.hasOwnProperty('module')) {
          msgArray.push('**This command is part of the** `' + commando.module + '` **module**');
        }
        if (commando.hasOwnProperty('level')) {
          msgArray.push("**Needed access level:** " + commando.level); // Push the needed access level to the array
        }
        if (commando.hasOwnProperty('methods')) {
          msgArray.push('Avalible methods to change: ' + commando.methods.join(', '));
        }
        if (commando.hasOwnProperty('vars')) {
          msgArray.push('Special words, they will dynamically change if the method supports it: ' + commando.vars.join(', '));
        }
        if (commando.hasOwnProperty('music')) { // Push music message if command is musical.
          msgArray.push("**This is a music related command, you'll need a role called** `Radio Master` **to use this command.**");
        }
        if (suffix == "meme") { // If command requested is meme, print avalible meme's
          msgArray.push("");
          var str = "**Currently available memes:\n**";
          var meme = require("./memes.json");
          for (var m in meme) {
            str += m + ", ";
          }
          msgArray.push(str);
        }
        if (ConfigFile.bot_settings.help_mode === "private") {
          bot.sendMessage(msg.author, msgArray);
          Logger.debug("Send suffix help via DM.");
        } else if (ConfigFile.bot_settings.help_mode === "channel") {
          bot.sendMessage(msg.channel, msgArray);
          Logger.debug("Send suffix help to channel.");
        } else {
          Logger.error("Config File error! Help mode is incorrectly defined!");
          bot.sendMessage(msg.channel, "Sorry, my owner didn't configure me correctly!");
        }
      } else {
        bot.sendMessage(msg.channel, "There is no **" + suffix + "** command!");
      }
    }
  }
};

exports.Commands = Commands;
