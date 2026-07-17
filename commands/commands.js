const store = require("../store/store");
const { recallMessage, parseCardMessage, parseId } = require("../utils/message");
const { registerMessageEventOnce } = require("../events/events");
const { replyMessage, isPrivateMessage, compareContent, contentIsLagal } = require("../utils/message");
const { getUserInfo } = require("../utils/user");
const { getGuildMemberList } = require("../utils/guild")
const { isUserEntryEmpty } = require("../utils/data")

function registerCommands() {
  // 绑定农场链接
  store.ctx
    .command("qq-farm-link.bind [user:string]", "绑定农场链接")
    .usage("user 绑定用户，可使用at或QQ号，默认为自己")
    .action(async (argv, user) => {
      const userId = argv.session.userId;
      let targetUserId = userId;
      if(user) {
        const ids = parseId(user)
        if(ids && ids.length > 0) {
          if(targetUserId !== ids[0] && !store.config.superAdminList.includes(userId)) {
            replyMessage(argv.session, "你没有权限为其他用户绑定农场链接");
            return;
          }
          targetUserId = ids[0];
        } else {
          replyMessage(argv.session, "无效的用户参数");
          return;
        }
      }

      const username = (await getUserInfo(argv.session.platform, targetUserId))?.name ?? "该用户";

      const userData = store.userManager.getUser(argv.session.platform, targetUserId);
      if(userData && userData.farmId) {
        replyMessage(argv.session, `${userId === targetUserId ? "你" : username}已经绑定农场链接，请勿重复绑定`);
        return;
      }

      replyMessage(argv.session, `请在${store.config.bindFarmLinkWaitTime}秒内发送农场小程序分享卡片以完成绑定，发送其他内容或超时将取消绑定`)
      registerMessageEventOnce(argv.session.platform, argv.session.channelId, argv.session.userId, (session) => {
        const content = session.content || "";
        const cardData = parseCardMessage(content);
        if (cardData) {
          if (cardData?.meta?.detail_1?.appid === "1112386029") {
            const url = cardData?.meta?.detail_1?.url
            if(url) {
              const farmId = url.replace(store.config.urlPrefix, "");
              store.userManager.setUser(argv.session.platform, targetUserId, {
                farmId: farmId,
              });
              replyMessage(argv.session, "绑定成功");
              return
            }
          }
        }
        replyMessage(argv.session, "绑定失败，请发送正确的农场小程序分享卡片，绑定操作已取消");
      }, store.config.bindFarmLinkWaitTime * 1000, () => {
        replyMessage(argv.session, "绑定超时，绑定操作已取消");
      });
    });

  // 解绑农场链接
  store.ctx
    .command("qq-farm-link.unbind [user:string]", "解绑农场链接")
    .usage("user 解绑用户，可使用at或QQ号，默认为自己")
    .action(async (argv, user) => {
      let targetUserId = argv.session.userId;
      if(user) {
        const ids = parseId(user)
        if(ids && ids.length > 0) {
          if(targetUserId !== ids[0] && !store.config.superAdminList.includes(argv.session.userId)) {
            replyMessage(argv.session, "你没有权限为其他用户解绑农场链接");
            return;
          }
          targetUserId = ids[0];
        } else {
          replyMessage(argv.session, "无效的用户参数");
          return;
        }
      }

      const username = (await getUserInfo(argv.session.platform, targetUserId))?.name ?? "该用户";

      const userData = store.userManager.getUser(argv.session.platform, targetUserId);
      if(!userData || !userData.farmId) {
        replyMessage(argv.session, `${argv.session.userId === targetUserId ? "你" : username}还没有绑定农场链接`);
        return;
      }

      store.userManager.setUser(argv.session.platform, targetUserId, {
        farmId: "",
      });

      replyMessage(argv.session, `${argv.session.userId === targetUserId ? "你" : username}的农场链接已解绑`);
    });

  // 查看农场链接
  store.ctx
    .command("qq-farm-link.link [user:string]", "查看农场链接")
    .usage("user 查看用户，可使用at或QQ号，默认为自己")
    .action(async (argv, user) => {
      let targetUserId = argv.session.userId;
      if(user) {
        const ids = parseId(user)
        if(ids && ids.length > 0) {
          targetUserId = ids[0];
        } else {
          replyMessage(argv.session, "无效的用户参数");
          return;
        }
      }

      const username = (await getUserInfo(argv.session.platform, targetUserId))?.name ?? "该用户";

      const userData = store.userManager.getUser(argv.session.platform, targetUserId);
      if(!userData || !userData.farmId) {
        replyMessage(argv.session, `${argv.session.userId === targetUserId ? "你" : username}还没有绑定农场链接`);
        return;
      }

      replyMessage(argv.session, `${username}的农场链接为：\n${store.config.urlPrefix}${userData.farmId}\n手机QQ点击链接即可快速跳转到ta的农场`);
    });

  // 关联用户
  store.ctx
    .command("qq-farm-link.linkuser.add <user:string> [targetUser:string]", "添加关联用户")
    .usage("user 添加关联的子用户，可使用at或QQ号; targetUser 添加关联的主用户，可使用at或QQ号，默认为自己")
    .action(async (argv, user, targetUser) => {
      const userId = argv.session.userId;
      let linkUserId = null;
      let targetUserId = userId;
      if(user) {
        const ids = parseId(user)
        if(ids && ids.length > 0) {
          linkUserId = ids[0];
        } else {
          replyMessage(argv.session, "无效的子用户参数");
          return;
        }
      } else {
        replyMessage(argv.session, "请指定要关联的子用户");
        return;
      }

      if(linkUserId === targetUserId) {
        replyMessage(argv.session, "主用户和子用户不能相同");
        return;
      }

      if(targetUser) {
        const ids = parseId(targetUser)
        if(ids && ids.length > 0) {
          if(targetUserId !== ids[0] && !store.config.superAdminList.includes(userId)) {
            replyMessage(argv.session, "你没有权限为其他用户关联子用户");
            return;
          }
          targetUserId = ids[0];
        } else {
          replyMessage(argv.session, "无效的主用户参数");
          return;
        }
      }

      const linkUsername = (await getUserInfo(argv.session.platform, linkUserId))?.name ?? "该用户";
      const targetUsername = (await getUserInfo(argv.session.platform, targetUserId))?.name ?? "该子用户";

      const userData = store.userManager.getUser(argv.session.platform, targetUserId);

      if(userData) {
        if(userData.linkedUsers.includes(linkUserId)) {
          replyMessage(argv.session, `${userId === targetUserId ? "你" : targetUsername}已经关联了${linkUserId === targetUserId ? "自己" : linkUsername}，请勿重复关联`);
        return;
        }
        if(userData.linkedUsers.length >= store.config.linkUserLimit) {
          replyMessage(argv.session, `${userId === targetUserId ? "你" : targetUsername}的关联用户数量已达上限，无法再添加新的关联用户`);
          return;
        }
      }

      replyMessage(argv.session, `请在${store.config.addLinkUserWaitTime}秒内使用${linkUsername}(${linkUserId})用户在任意包含机器人的会话中发送主用户的QQ号(${targetUserId})以完成关联，发送其他内容或超时将取消关联`);
      registerMessageEventOnce(argv.session.platform, undefined, linkUserId, (session) => {
        if(session.content && session.content === targetUserId) {
          store.userManager.setUser(argv.session.platform, targetUserId, {
            linkedUsers: [...(userData?.linkedUsers ?? []), linkUserId],
          });
          replyMessage(session, `你已成功被主用户${targetUsername}(${targetUserId})关联`);
          replyMessage(argv.session, `${userId === targetUserId ? "你" : targetUsername}已成功关联子用户${linkUsername}`);
        } else {
          replyMessage(argv.session, `${userId === targetUserId ? "" : targetUsername}关联${linkUsername}失败，请使用子用户发送正确的主用户QQ号`);
        }
      }, store.config.addLinkUserWaitTime * 1000, () => {
        replyMessage(argv.session, "关联超时，关联操作已取消");
      });
    });

  // 取消关联用户
  store.ctx
    .command("qq-farm-link.linkuser.remove <user:string> [targetUser:string]", "取消关联用户")
    .usage("user 取消关联的子用户，可使用at或QQ号；targetUser 要取消关联的主用户，可使用at或QQ号，默认为自己")
    .action(async (argv, user) => {
      const userId = argv.session.userId;
      let linkUserId = null;
      let targetUserId = userId;
      if(user) {
        const ids = parseId(user)
        if(ids && ids.length > 0) {
          linkUserId = ids[0];
        } else {
          replyMessage(argv.session, "无效的子用户参数");
          return;
        }
      } else {
        replyMessage(argv.session, "请指定要取消关联的子用户");
        return;
      }

      const linkUsername = (await getUserInfo(argv.session.platform, linkUserId))?.name ?? "该用户";
      const targetUsername = (await getUserInfo(argv.session.platform, targetUserId))?.name ?? "该子用户";

      const userData = await store.userManager.getUser(argv.session.platform, targetUserId);

      if(!userData || !userData?.linkedUsers.includes(linkUserId)) {
        replyMessage(argv.session, `${userId === targetUserId ? "你" : targetUsername}没有关联${linkUsername}`);
        return;
      }

      store.userManager.setUser(argv.session.platform, targetUserId, {
        linkedUsers: userData.linkedUsers.filter(id => id !== linkUserId),
      });

      replyMessage(argv.session, `${userId === targetUserId ? "你" : targetUsername}已成功取消关联${linkUsername}`);
    })

  // 取消被关联
  store.ctx
    .command("qq-farm-link.linkuser.cancel <user:string>", "取消被关联")
    .usage("user 取消被关联的主用户，可使用at或QQ号")
    .action(async (argv, user) => {
      const userId = argv.session.userId;
      let linkUserId = null;
      if(user) {
        const ids = parseId(user)
        if(ids && ids.length > 0) {
          linkUserId = ids[0];
        } else {
          replyMessage(argv.session, "无效的主用户参数");
          return;
        }
      } else {
        replyMessage(argv.session, "请指定要取消关联的主用户");
        return;
      }

      const linkUsername = (await getUserInfo(argv.session.platform, linkUserId))?.name ?? "该用户";

      const userData = store.userManager.getUser(argv.session.platform, linkUserId);

      if(!userData || !userData?.linkedUsers.includes(userId)) {
        replyMessage(argv.session, `你没有被${linkUsername}关联`);
        return;
      }

      store.userManager.setUser(argv.session.platform, linkUserId, {
        linkedUsers: userData.linkedUsers.filter(id => id !== userId),
      });

      replyMessage(argv.session, `你已成功取消被${linkUsername}关联`);
    });

  // 查看关联用户
  store.ctx
    .command("qq-farm-link.linkuser.list [user:string]", "查看关联用户")
    .usage("user 查看关联的用户，可使用at或QQ号，默认为自己")
    .action(async (argv, user) => {
      const userId = argv.session.userId;

      let targetUserId = userId;
      if(user) {
        const ids = parseId(user)
        if(ids && ids.length > 0) {
          targetUserId = ids[0];
        } else {
          replyMessage(argv.session, "无效的用户参数");
          return;
        }
      }

      const targetUsername = (await getUserInfo(argv.session.platform, targetUserId))?.name ?? "该用户";

      const userData = store.userManager.getUser(argv.session.platform, targetUserId);

      const linkedUsers = userData?.linkedUsers || [];
      if(!userData || linkedUsers.length === 0) {
        replyMessage(argv.session, `${targetUserId === userId ? '你' : targetUsername}没有关联任何用户`);
        return;
      }

      const linkedUserInfo = await Promise.all(linkedUsers.map(id => getUserInfo(argv.session.platform, id)));

      const isPrivate = isPrivateMessage(argv.session.channelId);

      replyMessage(argv.session, `${targetUsername}关联的用户有：<message forward><message>${linkedUserInfo.map(user => `${user?.name ?? "子用户"}${isPrivate ? `(${user.id})` : ""}`).join("\n")}</message></message>`);
    });

  // 添加关键词
  store.ctx
    .command("qq-farm-link.keywords.add [scope:string] [user:string]", "添加农场链接触发关键词，仅支持文字、图片和表情")
    .usage("scope 发送范围，1为主用户，2为全部子用户，3为主用户和全部子用户，默认为1")
    .action(async (argv, scope, user) => {
      let scopeValue = "1";
      const userId = argv.session.userId;
      let targetUserId = userId;
      if(user) {
        const ids = parseId(user)
        if(ids && ids.length > 0) {
          targetUserId = ids[0];
        } else {
          replyMessage(argv.session, "无效的用户参数");
          return;
        }
      }

      if(scope) {
        if(["1", "2", "3"].includes(scope)) {
          scopeValue = scope;
        } else {
          replyMessage(argv.session, "无效的发送范围参数");
          return;
        }
      }

      const userData = store.userManager.getUser(argv.session.platform, targetUserId);

      if(userData && userData.keywords.length >= store.config.keywordsLimit) {
        const username = (await getUserInfo(argv.session.platform, targetUserId))?.name ?? "该用户";
        replyMessage(argv.session, `${targetUserId === argv.session.userId ? "你" : username}的关键词数量已达上限（${store.config.keywordsLimit}个），无法继续添加`);;
        return;
      }

      replyMessage(argv.session, `请在${store.config.addKeywordWaitTime}秒内发送需要添加的关键词，超时将取消添加`);
      registerMessageEventOnce(argv.session.platform, argv.session.channelId, argv.session.userId, (session) => {
        const keyword = session.content
        if(!contentIsLagal(keyword)) {
          replyMessage(argv.session, "关键词仅支持文字、图片和表情，添加操作已取消");
          return;
        }
        if(userData && userData.keywords.some(keywordObj => compareContent(keywordObj.keyword, keyword))) {
          replyMessage(argv.session, "关键词已存在，添加操作已取消");
          return;
        }
        replyMessage(argv.session, `请选择是否at订阅用户：发送(是/否)，${store.config.addKeywordWaitTime}秒内未发送或发送无效将设为否`);
        registerMessageEventOnce(argv.session.platform, argv.session.channelId, argv.session.userId, (session) => {
          const enableAtResponse = session.content;
          const enableAt = enableAtResponse === "是" ? "1" : "0";
          store.userManager.setUser(argv.session.platform, targetUserId, {keywords: [...(userData?.keywords || []), {keyword, enableAt, scope: scopeValue}]});
          replyMessage(argv.session, `关键词添加成功\n范围：${scopeValue === "1" ? "主用户" : scopeValue === "2" ? "全部子用户" : "主用户和全部子用户"}\n是否at订阅用户：${enableAt === "1" ? "是" : "否"}`);
        }, store.config.addKeywordWaitTime * 1000, () => {
          store.userManager.setUser(argv.session.platform, targetUserId, {keywords: [...(userData?.keywords || []), {keyword, enableAt: "0", scope: scopeValue}]});
          replyMessage(argv.session, `关键词添加成功\n范围：${scopeValue === "1" ? "主用户" : scopeValue === "2" ? "全部子用户" : "主用户和全部子用户"}\n是否at订阅用户：否`);
        });
      }, store.config.addKeywordWaitTime * 1000, () => {
        replyMessage(argv.session, "添加关键词超时，操作已取消");
      });
    })

  // 删除关键词
  store.ctx
    .command("qq-farm-link.keywords.remove <index:posint> [user:string]", "删除农场链接触发关键词")
    .usage("index 删除关键词的序号，user 删除关键词的用户，可使用at或QQ号，默认为自己")
    .action(async (argv, index, user) => {
      let targetUserId = argv.session.userId;
      if(user) {
        const ids = parseId(user)
        if(ids && ids.length > 0) {
          if(targetUserId !== ids[0] && !store.config.superAdminList.includes(argv.session.userId)) {
            replyMessage(argv.session, "你没有权限删除其他用户的关键词");
            return;
          }
          targetUserId = ids[0];
        } else {
          replyMessage(argv.session, "无效的用户参数");
          return;
        }
      }

      const keywords = store.userManager.getUser(argv.session.platform, targetUserId)?.keywords;
      if(!index || !keywords || index < 1 || index > keywords.length) {
        replyMessage(argv.session, "无效的关键词序号");
        return;
      }

      const success = await store.userManager.setUser(argv.session.platform, targetUserId, {keywords: keywords.filter((_, i) => i !== index - 1)});
      if(success) {
        replyMessage(argv.session, "关键词删除成功");
      } else {
        replyMessage(argv.session, "关键词删除失败");
      }
    })

  // 清除关键词
  store.ctx
    .command("qq-farm-link.keywords.clear [user:string]", "清除所有农场链接触发关键词")
    .usage("user 清除关键词的用户，可使用at或QQ号，默认为自己")
    .action(async (argv, user) => {
      let targetUserId = argv.session.userId;
      if(user) {
        const ids = parseId(user)
        if(ids && ids.length > 0) {
          if(targetUserId !== ids[0] && !store.config.superAdminList.includes(argv.session.userId)) {
            replyMessage(argv.session, "你没有权限清除其他用户的关键词");
            return;
          }
          targetUserId = ids[0];
        } else {
          replyMessage(argv.session, "无效的用户参数");
          return;
        }
      }

      const success = await store.userManager.setUser(argv.session.platform, targetUserId, {keywords: []});
      if(success) {
        replyMessage(argv.session, "所有关键词清除成功");
      } else {
        replyMessage(argv.session, "关键词清除失败");
      }
    })

  // 查看关键词
  store.ctx
    .command("qq-farm-link.keywords.list [user:string]", "查看农场链接触发关键词")
    .usage("user 查看用户，可使用at或QQ号，默认为自己")
    .action(async (argv, user) => {
      let targetUserId = argv.session.userId;
      if(user) {
        const ids = parseId(user)
        if(ids && ids.length > 0) {
          if(targetUserId !== ids[0] && !store.config.superAdminList.includes(argv.session.userId)) {
            replyMessage(argv.session, "你没有权限查看其他用户的关键词");
            return;
          }
          targetUserId = ids[0];
        } else {
          replyMessage(argv.session, "无效的用户参数");
          return;
        }
      }

      const keywords = store.userManager.getUser(argv.session.platform, targetUserId)?.keywords ?? [];
      const username = (await getUserInfo(argv.session.platform, targetUserId))?.name ?? "该用户";
      if(keywords.length === 0) {
        replyMessage(argv.session, `${targetUserId === argv.session.userId ? "你" : username}尚未设置任何关键词`);
      } else {
        const keywordList = keywords.map((k, index) => `<message>${index + 1}. 发送范围：${k.scope === "1" ? "主用户" : k.scope === "2" ? "全部子用户" : "主用户和全部子用户"}，是否at全体成员：${k.enableAt === "0" ? "否" : "是"}\n关键词内容：\n${k.keyword}</message>`).join("");
        let message = `${targetUserId === argv.session.userId ? "你的" : username + "的"}关键词列表：\n<message forward>${keywordList}</message>`;
        replyMessage(argv.session, message);
      }
    })

  // 订阅群聊关键词at
  store.ctx
    .command("qq-farm-link.group.subscribe [user:string]", "订阅群聊关键词at，订阅后，当关键词触发时会at你")
    .usage("user 订阅at的用户，可使用at或QQ号，默认为自己")
    .action(async (argv, user) => {
      if(isPrivateMessage(argv.session.channelId)) return;

      let targetUserId = argv.session.userId;
      if(user) {
        const ids = parseId(user)
        if(ids && ids.length > 0) {
          if(targetUserId !== ids[0] && !store.config.superAdminList.includes(argv.session.userId)) {
            replyMessage(argv.session, "你没有权限为其他用户订阅关键词at");
            return;
          }
          targetUserId = ids[0];
        } else {
          replyMessage(argv.session, "无效的用户参数");
          return;
        }
      }

      const username = (await getUserInfo(argv.session.platform, targetUserId))?.name || "该用户";

      const groupEntry = store.groupManager.getGroup(argv.session.platform, argv.session.channelId);
      if(!groupEntry) {
        store.groupManager.setGroup(argv.session.platform, argv.session.channelId, {
          subscribers: [targetUserId],
        });
        replyMessage(argv.session, `${targetUserId === argv.session.userId ? "你" : username}已成功订阅本群关键词at，当本群有关键词触发时会at${targetUserId === argv.session.userId ? "你" : " ta"}`);
        return;
      }

      const subscribers = groupEntry.subscribers || [];
      if(!subscribers.includes(targetUserId)) {
        subscribers.push(targetUserId);
        store.groupManager.setGroup(argv.session.platform, argv.session.channelId, {
          subscribers,
        });
        replyMessage(argv.session, `${targetUserId === argv.session.userId ? "你" : username}已成功订阅本群关键词at，当本群有关键词触发时会at${targetUserId === argv.session.userId ? "你" : " ta"}`);
      } else {
        replyMessage(argv.session, `${targetUserId === argv.session.userId ? "你" : username}已订阅过本群关键词at，请勿重复订阅`);
      }
    });

  // 取消订阅群聊关键词at
  store.ctx
    .command("qq-farm-link.group.unsubscribe [user:string]", "取消订阅群聊关键词at")
    .usage("user 取消订阅at的用户，可使用at或QQ号，默认为自己")
    .action(async (argv, user) => {
      if(isPrivateMessage(argv.session.channelId)) return;

      let targetUserId = argv.session.userId;
      if(user) {
        const ids = parseId(user)
        if(ids && ids.length > 0) {
          if(targetUserId !== ids[0] && !store.config.superAdminList.includes(argv.session.userId)) {
            replyMessage(argv.session, "你没有权限为其他用户取消订阅关键词at");
            return;
          }
          targetUserId = ids[0];
        } else {
          replyMessage(argv.session, "无效的用户参数");
          return;
        }
      }

      const username = (await getUserInfo(argv.session.platform, targetUserId))?.name || "该用户";

      const groupEntry = store.groupManager.getGroup(argv.session.platform, argv.session.channelId);
      if(!groupEntry) {
        replyMessage(argv.session, `${targetUserId === argv.session.userId ? "你" : username}未订阅本群关键词at`);
        return;
      }

      const subscribers = groupEntry.subscribers || [];
      if(subscribers.includes(targetUserId)) {
        const index = subscribers.indexOf(targetUserId);
        if(index !== -1) {
          subscribers.splice(index, 1);
        }
        await store.groupManager.setGroup(argv.session.platform, argv.session.channelId, {
          settings: groupEntry.settings || {},
          subscribers,
        });
        replyMessage(argv.session, `${targetUserId === argv.session.userId ? "你" : username}已成功取消订阅本群关键词at，本群有关键词触发时将不再at${targetUserId === argv.session.userId ? "你" : " ta"}`);
      } else {
        replyMessage(argv.session, `${targetUserId === argv.session.userId ? "你" : username}未订阅本群关键词at`);
      }
    });

  // 查看群聊订阅者列表
  store.ctx
    .command("qq-farm-link.group.subscribers", "展示当前群聊关键词at订阅者列表")
    .action(async (argv) => {
      if(isPrivateMessage(argv.session.channelId)) return;

      const groupEntry = store.groupManager.getGroup(argv.session.platform, argv.session.channelId);
      if(groupEntry && groupEntry.subscribers?.length > 0) {
        const members = (await getGuildMemberList(argv.session.platform, argv.session.channelId)).map((member) => ({
          userId: member.user.id,
          nick: member.nick || member.user.username || member.user.userId
        }));
        const subscribers = groupEntry.subscribers.map((userId) => `${members.find((member) => member.userId === userId)?.nick || '未知用户'}(${userId})`);
        replyMessage(argv.session, `当前群聊关键词at订阅者列表：<message forward><message>${subscribers.join("\n")}</message></message>`);
      } else {
        replyMessage(argv.session, "当前群聊没有关键词at订阅者");
      }
    });

  // 查看群聊设置
  store.ctx
    .command("qq-farm-link.group.settings.list", "展示当前群聊设置")
    .action((argv) => {
      if(isPrivateMessage(argv.session.channelId)) return;

      const groupEntry = store.groupManager.getGroup(argv.session.platform, argv.session.channelId);
      const groupSettings = {
        enableKeywordTrigger: "",
        enableAt: "",
        enableAtAll: "",
      }
      if(groupEntry) {
        groupSettings.enableKeywordTrigger = groupEntry.settings?.enableKeywordTrigger || "";
        groupSettings.enableAt = groupEntry.settings?.enableAt || "";
        groupSettings.enableAtAll = groupEntry.settings?.enableAtAll || "";
      }
      replyMessage(
        argv.session,
        `QQ农场链接 当前群聊设置：\nenableKeywordTrigger(关键词触发): ${
          groupSettings.enableKeywordTrigger === "" ? `默认(${store.config.groupDefaultEnableKeywordTrigger ? "启用" : "禁用"})` : groupSettings.enableKeywordTrigger === "0" ? "禁用" : "启用"
        }\nenableAt(at订阅用户): ${
          groupSettings.enableAt === "" ? `默认(${store.config.groupDefaultEnableAt ? "启用" : "禁用"})` : groupSettings.enableAt === "0" ? "禁用" : "启用"
        }\nenableAtAll(忽略订阅用户列表at所有人): ${
          groupSettings.enableAtAll === "" ? `默认(${store.config.groupDefaultEnableAtAll ? "启用" : "禁用"})` : groupSettings.enableAtAll === "0" ? "禁用" : "启用"
        }`);
    });

  // 更改群聊设置
  store.ctx
    .command("qq-farm-link.group.settings.set <key:string> <value:string>", "更改当前群聊设置")
    .usage("key 群聊设置的键名，enableKeywordTrigger或enableAt或enableAtAll；value 设置的值，0禁用，1启用，default跟随默认设置")
    .action(async (argv, key, value) => {
      if(isPrivateMessage(argv.session.channelId)) return;

      if (
        !store.config.superAdminList.includes(argv.session.userId) &&
        (argv.session.event.member?.roles?.includes("owner") ||
          argv.session.event.member?.roles?.includes("admin"))
      ) {
        replyMessage(argv.session, "你没有权限更改该群聊设置");
        return;
      }

      if (!["enableKeywordTrigger", "enableAt", "enableAtAll"].includes(key)) {
        replyMessage(argv.session, "无效的设置键名");
        return;
      }

      if(!["0", "1", "default"].includes(value)) {
        replyMessage(argv.session, "无效的设置值");
        return;
      }

      const groupEntry = store.groupManager.getGroup(argv.session.platform, argv.session.channelId);
      if(!groupEntry) {
        if(value !== "default") {
          store.groupManager.setGroup(argv.session.platform, argv.session.channelId, {
            settings: {
              [key]: value,
            },
            subscribers: [],
          });
        }
      } else {
        const newGroupSettingsEntry = {
          ...groupEntry,
          settings: {
            ...groupEntry.settings,
            [key]: value === "default" ? "" : value,
          },
        };
        store.groupManager.setGroup(argv.session.platform, argv.session.channelId, {
          settings: newGroupSettingsEntry.settings
        });
      }

      const groupDefaultSettingsKey = {
        enableKeywordTrigger: "groupDefaultEnableKeywordTrigger",
        enableAt: "groupDefaultEnableAt",
        enableAtAll: "groupDefaultEnableAtAll",
      }

      replyMessage(argv.session, `群聊设置已更新：${key}已设为${value === "default" ? `默认(${store.config[groupDefaultSettingsKey[key]] === "0" ? "禁用" : "启用"})` : value === "0" ? "禁用" : "启用"}`);
    });

  // 群聊设置恢复默认
  store.ctx
    .command("qq-farm-link.group.settings.reset", "恢复当前群聊设置为默认值")
    .action(async (argv) => {
      if(isPrivateMessage(argv.session.channelId)) return;

      if (
        !store.config.superAdminList.includes(argv.session.userId) &&
        (argv.session.event.member?.roles?.includes("owner") ||
          argv.session.event.member?.roles?.includes("admin"))
      ) {
        replyMessage(argv.session, "你没有权限更改该群聊设置");
        return;
      }

      const groupEntry = store.groupManager.getGroup(argv.session.platform, argv.session.channelId);
      if(groupEntry) {
        store.groupManager.setGroup(argv.session.platform, argv.session.channelId, {
          settings: {
            enableKeywordTrigger: "",
            enableAt: "",
            enableAtAll: ""
          }
        });
      }

      replyMessage(argv.session, "群聊设置已恢复为默认值");
    });

  // 重载数据库数据
  store.ctx
    .command("qq-farm-link.reload", "从数据库重载数据到内存")
    .action(async (argv) => {
      if(isPrivateMessage(argv.session.channelId)) return;

      if (!store.config.superAdminList.includes(argv.session.userId)) {
        replyMessage(argv.session, "你没有权限重载数据");
        return;
      }

      await store.userManager.loadUsersFromDatabase();
      await store.groupManager.loadGroupsFromDatabase();
      replyMessage(argv.session, "内存数据已从数据库重载");
    });
}

module.exports = { registerCommands };
