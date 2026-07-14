const store = require("../store/store");
const {
  replyMessage,
  isPrivateMessage,
  compareContent,
} = require("../utils/message");
const { getUserInfo } = require("../utils/user");
const { getGuildMemberList, getGuildList } = require("../utils/guild");

function registerEvents() {
  store.ctx.on("message", async (session) => {
    if (isPrivateMessage(session.channelId)) return;

    const group = store.groupManager.getGroup(
      session.platform,
      session.channelId,
    );
    const groupSettings = group?.settings || {
      enableKeywordTrigger: store.config.groupDefaultEnableKeywordTrigger
        ? "1"
        : "0",
      enableAt: store.config.groupDefaultEnableAt ? "1" : "0",
    };
    groupSettings.enableAt =
      groupSettings.enableAt || (store.config.groupDefaultEnableAt ? "1" : "0");
    if (groupSettings.enableKeywordTrigger === "0") return;

    const keywords = store.userManager.getUser(
      session.platform,
      session.userId,
    )?.keywords;
    if (keywords) {
      for (const keywordObj of keywords) {
        if (compareContent(keywordObj.keyword, session.content)) {
          const user = store.userManager.getUser(session.platform, session.userId);
          const linkedUsers = [];
          if (keywordObj.scope === "1") {
          } else if (keywordObj.scope === "2" || keywordObj.scope === "3") {
            for (const lu of user.linkedUsers) {
              const linkedUserEntry = store.userManager.getUser(
                session.platform,
                lu,
              );
              if (linkedUserEntry) {
                linkedUsers.push(linkedUserEntry);
              } else {
                linkedUsers.push({userId: lu, farmId: ""});
              }
            }
          }

          if (store.config.enableAt && groupSettings.enableAt === "1" && keywordObj.enableAt === "1") {
            let subscribers = (group?.subscribers || []).filter(
              (e) => e !== session.userId,
            );
            if (subscribers.length > 0) {
              // 每超过100条分一条消息，否则at会失效
              for (let i = 0; i < subscribers.length; i += 100) {
                const batch = subscribers.slice(i, i + 100);
                replyMessage(
                  session,
                  batch
                    .map((subscriber) => `<at id="${subscriber}" name=" "/>`)
                    .join(""),
                );
              }
            }
          }

          const username =
            (await getUserInfo(session.platform, session.userId))?.name ??
            "该用户";
          let linkedUserListMessage = "";
          if (keywordObj.scope === "1") {
            replyMessage(
              session,
              `${username}的农场链接为：\n${store.config.urlPrefix}${user.farmId}\n手机QQ点击链接即可快速跳转到ta的农场`,
            );
          } else if (keywordObj.scope === "2" || keywordObj.scope === "3") {
            for (const lu of linkedUsers) {
              const luUsername =
                (await getUserInfo(session.platform, lu.userId))?.name ??
                "子用户";
              linkedUserListMessage += `${luUsername}：${lu.farmId ? `${store.config.urlPrefix}${lu.farmId}` : "未绑定农场链接"}\n`;
            }
            if (keywordObj.scope === "2") {
              replyMessage(
                session,
                `${username}的关联用户农场链接如下，手机QQ点击链接即可快速跳转到对应的农场：\n${linkedUserListMessage}`,
              );
            } else if (keywordObj.scope === "3") {
              replyMessage(
              session,
              `${username}的农场链接为：\n${user.farmId ? `${store.config.urlPrefix}${user.farmId}` : "未绑定农场链接"}\n手机QQ点击链接即可快速跳转到ta的农场\n\nta的关联用户农场链接如下：\n${linkedUserListMessage}`,
            );
            }
          }
          break;
        }
      }
    }
  });
}

function registerMessageEventOnce(
  platform,
  channelId,
  userId,
  callback,
  timeout,
  timeoutCallback,
) {
  let timer = null;
  let offFunc = null;
  if (channelId) {
    offFunc = store.ctx
      .platform(platform)
      .channel(channelId)
      .user(userId)
      .once("message", (session) => {
        clearTimeout(timer);
        callback(session);
      });
  } else {
    offFunc = store.ctx
      .platform(platform)
      .user(userId)
      .once("message", (session) => {
        clearTimeout(timer);
        callback(session);
      });
  }
  timer = setTimeout(() => {
    offFunc();
    if (timeoutCallback) {
      timeoutCallback();
    }
  }, timeout);
}

module.exports = { registerEvents, registerMessageEventOnce };
