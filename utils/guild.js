const store = require("../store/store");

async function getGuildMemberList(platform, guildId) {
  const bot = store.ctx.bots.filter((bot) => bot.platform === platform)[0];
  if (bot) {
    try {
      const guildMemberData = await bot.getGuildMemberList(guildId)
      return guildMemberData?.data ?? null;
    } catch(e) {
      store.ctx.logger.error(`获取群成员列表失败: \n${e}`);
      return null;
    }
  } else {
    store.ctx.logger.error("获取群成员列表失败: 未找到对应平台的机器人");
    return null;
  }
}

async function getMembersByUserIds(platform, guildId, userIds) {
  let result = {
    members: [],
    nonMembers: []
  }
  const memberList = await getGuildMemberList(platform, guildId)
  if(memberList === null) return result;
  userIds.forEach(id => {
    const memberFound = memberList.find(m => m.user.id === id)
    if(memberFound) {
      result.members.push(memberFound)
    } else {
      result.nonMembers.push(id)
    }
  })
  return result;
}

async function getGuildInfo(platform, guildId) {
  const bot = store.ctx.bots.filter((bot) => bot.platform === platform)[0];
  if (bot) {
    try {
      const guildInfo = await bot.getGuild(guildId)
      return guildInfo;
    } catch (e) {
      store.ctx.logger.error(`获取群信息失败: \n${e}`);
      return null;
    }
  } else {
    store.ctx.logger.error("获取群信息失败: 未找到对应平台的机器人");
    return null;
  }
}

async function getGuildList(platform) {
  const bot = store.ctx.bots.filter((bot) => bot.platform === platform)[0];
  if (bot) {
    try {
      const guildList = (await bot.getGuildList()).data ?? null;
      return guildList ?? null;
    } catch (e) {
      store.ctx.logger.error(`获取群列表失败: \n${e}`);
      return null;
    }
  } else {
    store.ctx.logger.error("获取群列表失败: 未找到对应平台的机器人");
    return null;
  }
}

module.exports = { getGuildMemberList, getMembersByUserIds, getGuildInfo, getGuildList };
