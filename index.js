const { Schema } = require("koishi");
const store = require("./store/store");
const Database = require("./services/database");
const UserManager = require("./services/user-manager")
const GroupManager = require("./services/group-manager")
const { registerCommands } = require("./commands/commands");
const { registerEvents } = require("./events/events");

const name = "koishi-plugin-lollipop-qq-farm-link";
const inject = ["database"];

const defaultConfig = {
  superAdminList: [],
  enableKeywordTrigger: true,
  enableAt: true,
  strictKeywordImageType: false,
  keywordsLimit: 10,
  linkUserLimit: 20,
  bindFarmLinkWaitTime: 60,
  addLinkUserWaitTime: 60,
  addKeywordWaitTime: 60,
  urlPrefix: "m.q.qq.com/a/s/",
  groupDefaultEnableKeywordTrigger: true,
  groupDefaultEnableAt: true,
};

const Config = Schema.intersect([
  Schema.object({
    superAdminList: Schema.array(String)
      .default(defaultConfig.superAdminList)
      .description("超级管理员QQ号列表"),
    enableKeywordTrigger: Schema.boolean()
      .default(defaultConfig.enableKeywordTrigger)
      .description("是否启用关键词触发"),
    enableAt: Schema.boolean()
      .default(defaultConfig.enableAt)
      .description("是否启用at订阅用户"),
    keywordsLimit: Schema.number()
      .default(defaultConfig.keywordsLimit)
      .description("每用户关键词数量限制"),
    linkUserLimit: Schema.number()
      .default(defaultConfig.linkUserLimit)
      .description("每用户关联用户数量限制"),
    strictKeywordImageType: Schema.boolean()
      .default(defaultConfig.strictKeywordImageType)
      .description("是否严格匹配关键词中的图片类型（图片/表情图片）"),
    bindFarmLinkWaitTime: Schema.number()
      .default(defaultConfig.bindFarmLinkWaitTime)
      .description("绑定农场链接等待时间（秒）"),
    addLinkUserWaitTime: Schema.number()
      .default(defaultConfig.addLinkUserWaitTime)
      .description("添加关联用户等待时间（秒）"),
    addKeywordWaitTime: Schema.number()
      .default(defaultConfig.addKeywordWaitTime)
      .description("添加关键词等待时间（秒）"),
    urlPrefix: Schema.string()
      .default(defaultConfig.urlPrefix)
      .description("URL前缀"),
  }).description("通用配置"),
  Schema.object({
    groupDefaultEnableKeywordTrigger: Schema.boolean()
      .default(defaultConfig.groupDefaultEnableKeywordTrigger)
      .description("是否启用关键词触发"),
    groupDefaultEnableAt: Schema.boolean()
      .default(defaultConfig.groupDefaultEnableAt)
      .description("是否启用at订阅用户"),
  }).description("群聊默认设置"),
])

function apply(ctx, config) {
  store.ctx = ctx;
  store.config = config;
  // 初始化数据库
  store.db = new Database(ctx);

  // 初始化关键词列表
  store.userManager = new UserManager(store.db);
  // 初始化群设置列表
  store.groupManager = new GroupManager(store.db);

  // 注册指令
  registerCommands();
  // 注册事件
  if(config.enableKeywordTrigger) {
    registerEvents();
  }
}

module.exports = { name, inject, Config, apply };
