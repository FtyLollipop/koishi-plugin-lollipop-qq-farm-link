const TABLE_NAME_USERS = "lollipop-qq-farm-link-users";
const TABLE_NAME_GROUPS = "lollipop-qq-farm-link-groups";

class Database {
  #ctx = null;

  constructor(ctx) {
    this.#ctx = ctx;

    // ctx.database.drop(TABLE_NAME_USERS);
    // ctx.database.drop(TABLE_NAME_GROUP_SETTINGS);

    ctx.model.extend(
      TABLE_NAME_USERS,
      {
        id: "unsigned",
        platform: "string",
        userId: "string",
        farmId: "string",
        keywords: "json",
        linkedUsers: "list",
      },
      {
        primaryKey: "id",
        autoInc: true,
      },
    );

    ctx.model.extend(
      TABLE_NAME_GROUPS,
      {
        id: "unsigned",
        platform: "string",
        channelId: "string",
        settings: "json",
        subscribers: "list",
      },
      {
        primaryKey: "id",
        autoInc: true,
      },
    );
  }

  getUserById(id) {
    return this.#ctx.database.get(TABLE_NAME_USERS, id);
  }

  getUsers(platform, userId, farmId) {
    let query = {};
    if (platform) query.platform = platform;
    if (userId) query.userId = userId;
    if (farmId) query.farmId = farmId;
    return this.#ctx.database.get(TABLE_NAME_USERS, query);
  }

  saveUser({ platform, userId, farmId, keywords, linkedUsers }) {
    return this.#ctx.database.create(TABLE_NAME_USERS, {
      platform,
      userId,
      farmId,
      keywords: keywords || [],
      linkedUsers: linkedUsers || [],
    });
  }

  updateUser({ id, platform, userId, farmId, keywords, linkedUsers }) {
    return this.#ctx.database.set(
      TABLE_NAME_USERS,
      { id },
      { platform, userId, farmId, keywords: keywords || [], linkedUsers: linkedUsers || [] },
    );
  }

  deleteUserById(id) {
    try {
      return this.#ctx.database.remove(TABLE_NAME_USERS, { id });
    } catch (error) {
      this.#ctx.logger.error("删除用户失败:\n", error);
      return false;
    }
  }

  getGroupById(id) {
    return this.#ctx.database.get(TABLE_NAME_GROUPS, id);
  }

  getGroups(platform, channelId) {
    let query = {};
    if (platform) query.platform = platform;
    if (channelId) query.channelId = channelId;
    return this.#ctx.database.get(TABLE_NAME_GROUPS, query);
  }

  saveGroup({ platform, channelId, settings, subscribers }) {
    return this.#ctx.database.create(TABLE_NAME_GROUPS, {
      platform,
      channelId,
      settings: settings || {
        enableKeywordTrigger: "",
        enableAt: "",
      },
      subscribers: subscribers || [],
    });
  }

  updateGroup({ id, platform, channelId, settings, subscribers }) {
    return this.#ctx.database.set(
      TABLE_NAME_GROUPS,
      { id },
      { platform, channelId, settings: settings || {
        enableKeywordTrigger: "",
        enableAt: "",
      }, subscribers: subscribers || [] },
    );
  }

  deleteGroupById(id) {
    try {
      return this.#ctx.database.remove(TABLE_NAME_GROUPS, { id });
    } catch (error) {
      this.#ctx.logger.error("删除群聊失败:\n", error);
      return false;
    }
  }
}

module.exports = Database;
