// Avatar-only guard: never interpret backend empty markers as page-relative images.
function avatarSource(value) {
  if (typeof value !== 'string') return '';
  var path=value.trim();
  if (!path || /^(?:0|false|null|undefined)$/i.test(path)) return '';
  // Remote avatars and platform-selected local files are kept intact. Bare
  // relative URLs are invalid here: the renderer would resolve against a page.
  return /^(?:https?:\/\/[^\s/]+(?:[/?#][^\s]*)?|(?:wxfile|ttfile|file):\/\/[^\s]+|\/(?!\/)[^\s]+|[a-z]:[\\/][^\s]+)$/i.test(path) ? path : '';
}
module.exports=avatarSource;
