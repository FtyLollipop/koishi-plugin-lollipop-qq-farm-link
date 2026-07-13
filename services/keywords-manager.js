const store = require("../store/store");
const { isUserEntryEmpty } = require("../utils/data");

class KeywordsManager {
  #keywords;
  #db;

  constructor(db) {
    this.#db = db;
    this.loadKeywordsFromDatabase();
  }

  // 从数据库加载关键词
  async loadKeywordsFromDatabase() {
    this.#keywords = new Map();
    const userData = await this.#db.getUsers();
    userData.forEach(user => {
      this.#keywords.set(`${user.platform}:${user.userId}`, user.keywords);
    });
    const count = userData.reduce((sum, user) => sum + (user.keywords?.length || 0), 0);
    store.ctx.logger.info(`已从数据库加载 ${userData.length} 个用户的 ${count} 个关键词`);
    return count;
  }

  // 获取指定用户的关键词
  getKeywords(platform, userId) {
    const key = `${platform}:${userId}`;
    return this.#keywords.get(key);
  }

  // 获取所有用户的关键词
  getAllKeywords() {
    return [...this.#keywords.values()];
  }

  // 添加关键词并持久化到数据库
  async addKeyword(platform, userId, {keyword, enableAt, scope}) {
    const keywordObj = {keyword, enableAt, scope};
    const key = `${platform}:${userId}`;
    const currentKeywords = this.#keywords.get(key);
    let newKeywords = null;
    if(!currentKeywords) {
      const newUser = await this.#db.saveUser({
        platform,
        userId,
        keywords: [keywordObj],
      });
      newKeywords = newUser.keywords;
    } else {
      const currentUser = await this.#db.getUsers(platform, userId);
      if (currentUser && currentUser.length > 0) {
        const newUser = {
          ...currentUser[0],
          keywords: [...currentKeywords, keywordObj],
        }
        await this.#db.updateUser(newUser);
        newKeywords = newUser.keywords;
      }
    }

    if(newKeywords) {
      this.#keywords.set(key, newKeywords);
      return true;
    } else {
      return false;
    }
  }

  // 删除关键词并持久化到数据库
  async removeKeyword(platform, userId, index) {
    const key = `${platform}:${userId}`;
    const currentKeywords = this.#keywords.get(key);
    if(!currentKeywords) return false;

    const newKeywords = currentKeywords.filter((_, i) => i !== index);
    const currentUser = await this.#db.getUsers(platform, userId);
    if (currentUser && currentUser.length > 0) {
      const newUserEntry = {
        ...currentUser[0],
        keywords: newKeywords,
      };
      if(isUserEntryEmpty(newUserEntry)) {
        await this.#db.deleteUserById(currentUser[0].id);
        this.#keywords.delete(key);
        return true;
      }

      await this.#db.updateUser(newUserEntry);
      this.#keywords.set(key, newKeywords);
      return true;
    }
    return false;
  }

  // 删除所有关键词
  async clearKeywords(platform, userId) {
    const key = `${platform}:${userId}`;
    const currentKeywords = this.#keywords.get(key);
    if(!currentKeywords) return false;

    const currentUser = await this.#db.getUsers(platform, userId);
    if (currentUser && currentUser.length > 0) {
      const newUserEntry = {
        ...currentUser[0],
        keywords: [],
      };
      if(isUserEntryEmpty(newUserEntry)) {
        await this.#db.deleteUserById(currentUser[0].id);
        this.#keywords.delete(key);
        return true;
      }

      await this.#db.updateUser(newUserEntry);
      this.#keywords.set(key, newUserEntry.keywords);
      return true;
    }
    return false;
  }
}

module.exports = KeywordsManager;
