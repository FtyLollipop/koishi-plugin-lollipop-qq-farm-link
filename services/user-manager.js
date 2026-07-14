const { is } = require("koishi");
const store = require("../store/store");
const { isUserEntryEmpty } = require("../utils/data");

class UserManager {
  #users;
  #db;

  constructor(db) {
    this.#db = db;
    this.loadUsersFromDatabase();
  }

  // 从数据库加载用户数据
  async loadUsersFromDatabase() {
    this.#users = new Map();
    const userData = await this.#db.getUsers();
    userData.forEach(user => {
      this.#users.set(`${user.platform}:${user.userId}`, user);
    });
    const count = userData.reduce((sum, user) => sum + (user.keywords?.length || 0), 0);
    store.ctx.logger.info(`已从数据库加载 ${userData.length} 个用户的 ${count} 个关键词`);
    return count;
  }

  // 获取指定用户的信息
  getUser(platform, userId) {
    const key = `${platform}:${userId}`;
    const user = this.#users.get(key)
    if(user) {
      return JSON.parse(JSON.stringify(user));
    } else {
      return user
    }
  }

  // 获取所有用户的信息
  getAllUsers() {
    return JSON.parse(JSON.stringify([...this.#users.values()]));
  }

  // 设置用户信息
  async setUser(platform, userId, {farmId, keywords, linkedUsers}) {
    const key = `${platform}:${userId}`;
    const user = this.#users.get(key);
    if (user) {
      const updatedUser = {
        ...user,
        farmId: farmId !== undefined ? farmId : user.farmId,
        keywords: keywords !== undefined ? keywords : user.keywords,
        linkedUsers: linkedUsers !== undefined ? linkedUsers : user.linkedUsers,
      };
      if(isUserEntryEmpty(updatedUser)) {
        await this.#db.deleteUserById(updatedUser.id);
        this.#users.delete(key);
        return true;
      } else {
        await this.#db.updateUser(updatedUser);
        this.#users.set(key, updatedUser);
        return true;
      }
    } else {
      const newUser = {
        platform,
        userId,
        farmId: farmId && farmId !== undefined ? farmId : "",
        keywords: keywords !== undefined ? keywords : [],
        linkedUsers: linkedUsers !== undefined ? linkedUsers : [],
      };
      if(isUserEntryEmpty(newUser)) {
        return true;
      }
      const newUserEntry = await this.#db.saveUser(newUser);
      this.#users.set(key, newUserEntry);
      return true;
    }
    return false;
  }
}

module.exports = UserManager;
