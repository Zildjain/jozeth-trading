export function plain(document) {
  if (!document) return null;
  const value = typeof document.toObject === 'function' ? document.toObject({ flattenMaps: true }) : { ...document };
  delete value._id;
  delete value.__v;
  delete value.passwordHash;
  delete value.sessionVersion;
  delete value.createdOn;
  delete value.modifiedOn;
  return value;
}

export async function safeList(Model, sort = { createdOn: -1 }, projection = undefined) {
  const docs = await Model.find({}, projection).sort(sort).limit(2000).lean();
  return docs.map((value) => {
    delete value._id;
    delete value.__v;
    delete value.passwordHash;
    delete value.sessionVersion;
    delete value.createdOn;
    delete value.modifiedOn;
    if (value.pages instanceof Map) value.pages = Object.fromEntries(value.pages);
    return value;
  });
}
