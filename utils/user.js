const store = require("../store/store");

async function getUserInfo(platform, userId) {
  const bot = store.ctx.bots.filter((bot) => bot.platform === platform)[0];
  if (bot) {
    const userInfo = await bot.getUser(userId)
    return userInfo ?? null;
  } else {
    store.ctx.logger.error("获取用户信息失败: 未找到对应平台的机器人");
    return null;
  }
}

module.exports = { getUserInfo };
