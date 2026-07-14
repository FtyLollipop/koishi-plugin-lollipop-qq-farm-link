const { subscribe } = require("node:diagnostics_channel");
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
          enableKeywordTrigger: group.settings?.enableKeywordTrigger || "",
          enableAt: group.settings?.enableAt || "",
          enableAtAll: group.settings?.enableAtAll || ""
        },
      });
    });

    store.ctx.logger.info(`已从数据库加载 ${groupData.length} 个群聊数据`);
  }

  // 剔除失效订阅者
  async #removeInvalidSubscribers(platform, channelId, subscribers) {
    if(!subscribers) return subscribers;
    const guildList = await getGuildList(platform);
    if (!guildList || !guildList.some(guild => guild.id === channelId)) return [];
    const members = await getGuildMemberList(platform, channelId);
    if (!members) return [];
    return subscribers.filter(subscriber => members.some(member => member.user.id === subscriber));
  }

  // 获取指定群聊信息
  getGroup(platform, channelId) {
    const key = `${platform}:${channelId}`;
    const group = this.#groups.get(key)
    if(group) {
      return {
        ...group,
        settings: {
          ...group.settings
        },
        subscribers: [...group.subscribers]
      };
    }
    return undefined;
  }

  // 获取所有群聊信息
  getAllGroups() {
    return [...this.#groups.values()].map(group => ({
      ...group,
      settings: {
        ...group.settings
      },
      subscribers: [...group.subscribers]
    }));
  }

  // 更改群聊信息并持久化到数据库（空的删除，新的添加）
  async setGroup(platform, channelId, { settings, subscribers }) {
    const key = `${platform}:${channelId}`;
    const group = this.#groups.get(key);
    let newGroup = null;
    if (!group) {
      const validSubscribers = await this.#removeInvalidSubscribers(platform, channelId, subscribers);
      if(isGroupEntryEmpty({ settings, subscribers: validSubscribers })) {
        return true;
      } else {
        newGroup = await this.#db.saveGroup({
          platform,
          channelId,
          settings: {
            enableKeywordTrigger: settings?.enableKeywordTrigger ?? "",
            enableAt: settings?.enableAt ?? "",
            enableAtAll: settings?.enableAtAll ?? ""
          },
          subscribers: validSubscribers || []
        });
      }
    } else {
      const newGroupEntry = {
        ...group,
        subscribers: await this.#removeInvalidSubscribers(platform, channelId, subscribers || group.subscribers),
        settings: {
          enableKeywordTrigger: settings?.enableKeywordTrigger ?? group.settings.enableKeywordTrigger,
          enableAt: settings?.enableAt ?? group.settings.enableAt,
          enableAtAll: settings?.enableAtAll ?? group.settings.enableAtAll,
        }
      }
      if(isGroupEntryEmpty(newGroupEntry)) {
        this.#db.deleteGroupById(group.id);
        this.#groups.delete(key);
        return true;
      } else {
        await this.#db.updateGroup(newGroupEntry);
        newGroup = newGroupEntry;
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
