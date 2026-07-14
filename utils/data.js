function isUserEntryEmpty(userEntry) {
  if(!userEntry.farmId && userEntry.keywords.length === 0 && userEntry.linkedUsers.length === 0) {
    return true;
  }
  return false;
}

function isGroupEntryEmpty(groupEntry) {
  if(!groupEntry?.settings?.enableKeywordTrigger === "" && !groupEntry?.settings?.enableAt === "" && (!groupEntry?.subscribers || groupEntry?.subscribers.length === 0)) {
    return true;
  }
  return false;
}

module.exports = {
  isUserEntryEmpty,
  isGroupEntryEmpty,
};
