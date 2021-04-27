/*globals avConfigData:false, $buo:false */

function $buo_f() {
  $buo(avConfigData.browserUpdate);
}

if (avConfigData.browserUpdate) {
  try {
    document.addEventListener("DOMContentLoaded", $buo_f, false);
  } catch (e) {
    window.attachEvent("onload", $buo_f);
  }
}
