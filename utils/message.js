const { h } = require("koishi");
const store = require("../store/store");

// 解析卡片消息
function parseCardMessage(msg) {
  const match = msg.match(/<[^>]+?\sdata="([\s\S]*?)"[^>]*>/);
  if (!match) return null;
  try {
    const data = match[1];
    const raw = h.unescape(data);
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

// 撤回消息
function recallMessage(platform, channelId, messageId) {
  const bot = store.ctx.bots.filter((bot) => bot.platform === platform)[0];
  bot.deleteMessage(channelId, messageId);
}

// 回复消息
async function replyMessage(session, message) {
  return await session.send(
    `<quote id="${session.event.message.id}"/>${message}`,
  );
}

// 判断是否为私信
function isPrivateMessage(channelId) {
  return /^private:/.test(channelId);
}

// 解析字符串，提取出纯数字id列表，若字符串不合法则返回null
function parseId(str) {
  if (str) {
    // 验证str是否只包含at标签、基础id和空格
    let cleaned = str
      .replace(/<at\s+[^>]*?\bid\s*=\s*"\d+"[^>]*?>/g, "")
      .replace(/\b\d+\b/g, "")
      .trim();
    if (cleaned) {
      return null;
    }
    // 抓取<at id="..."/>里的id
    const atIds = [
      ...str.matchAll(/<at\s+[^>]*?\bid\s*=\s*"(\d+)"[^>]*?>/g),
    ].map((m) => m[1]);

    // 去掉at标签后，剩下的纯数字id
    const withoutAt = str.replace(/<at\s+[^>]*?\bid\s*=\s*"\d+"[^>]*?>/g, " ");
    const plainIds = withoutAt.match(/\b\d+\b/g) || [];

    return [...atIds, ...plainIds];
  } else {
    return null;
  }
}

// 对比消息是否相同
function compareContent(str1, str2) {
  function normalize(str) {
    return str.replace(/<img\b[^>]*\/?>/gi, (img) => {
      const attrs = {};

      img.replace(
        /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g,
        (_, key, v1, v2) => {
          attrs[key.toLowerCase()] = v1 ?? v2 ?? "";
        },
      );

      if (store.config.strictKeywordImageType) {
        return `<img file="${attrs.file || ""}" sub-type="${attrs["sub-type"] || ""}" file-size="${attrs["file-size"] || ""}">`;
      } else {
        return `<img file="${attrs.file || ""}" file-size="${attrs["file-size"] || ""}">`;
      }
    });
  }
  return normalize(str1) === normalize(str2);
}

// 判断消息是否只包含文字、图片和表情
function contentIsLagal(text) {
    const tagRegex = /<\s*\/?\s*([a-zA-Z][\w-]*)\b[^>]*>/g;

    let match;
    while ((match = tagRegex.exec(text)) !== null) {
        const tagName = match[1].toLowerCase();
        if (tagName !== 'img' && tagName !== 'face') {
            return false;
        }
    }

    return true;
}

module.exports = {
  parseCardMessage,
  recallMessage,
  replyMessage,
  isPrivateMessage,
  parseId,
  compareContent,
  contentIsLagal,
};
