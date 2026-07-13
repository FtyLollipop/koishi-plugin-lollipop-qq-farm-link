const store = require("../store/store");
const { isUserEntryEmpty, isGroupEntryEmpty } = require("../utils/data");
const { getGuildMemberList, getGuildList } = require("../utils/guild")

class GroupManager {
  #groups;
  #db;

  constructor(db) {
    this.#db = db;
    this.loadGroupsFromDatabase();
  }

  // 从数据库加载群设置
  async loadGroupsFromDatabase() {
    this.#groups = new Map();
    const groupData = await this.#db.getGroups();
    groupData.forEach(group => {
      this.#groups.set(`${group.platform}:${group.channelId}`, {
        ...group,
        settings: {
          enableKeywordTrigger: group.settings.enableKeywordTrigger || "",
          enableAt: group.settings.enableAt || ""
        },
      });
    });
    store.ctx.logger.info(`已从数据库加载 ${groupData.length} 个群聊数据`);
  }

  // 剔除失效订阅者
  async #removeInvalidSubscribers(platform, channelId, subscribers) {
    const guildList = await getGuildList(platform);
    if (!guildList || !guildList.some(guild => guild.id === channelId)) return [];
    const members = await getGuildMemberList(platform, channelId);
    if (!members) return [];
    return subscribers.filter(subscriber => members.some(member => member.user.id === subscriber));
  }

  // 获取指定群聊信息
  getGroup(platform, channelId) {
    const key = `${platform}:${channelId}`;
    return this.#groups.get(key);
  }

  // 获取所有群聊信息
  getAllGroups() {
    return [...this.#groups.values()];
  }

  // 更改群聊信息并持久化到数据库（空的删除，新的添加）
  async setGroup(platform, channelId, { settings, subscribers }) {
    const key = `${platform}:${channelId}`;
    const validSubscribers = await this.#removeInvalidSubscribers(platform, channelId, subscribers);
    const group = this.#groups.get(key);
    let newGroup = null;
    if (!group) {
      if(isGroupEntryEmpty({ settings, subscribers })) {
        return true;
      } else {
        newGroup = await this.#db.saveGroup({
          platform,
          channelId,
          settings: {
            enableKeywordTrigger: settings?.enableKeywordTrigger || "",
            enableAt: settings?.enableAt || ""
          },
          subscribers: validSubscribers || []
        });
      }
    } else {
      if(isGroupEntryEmpty({ settings, subscribers })) {
        this.#db.deleteGroupById(group.id);
        this.#groups.delete(key);
        return true;
      } else {
        newGroup = {
          ...group,
          settings: {
            enableKeywordTrigger: settings?.enableKeywordTrigger ?? "",
            enableAt: settings?.enableAt ?? "",
          },
          subscribers: validSubscribers || []
        };
        await this.#db.updateGroup(newGroup);
      }
    }
    if (newGroup) {
      this.#groups.set(key, newGroup);
      return true;
    }
    return false;
  }
}

module.exports = GroupManager;
