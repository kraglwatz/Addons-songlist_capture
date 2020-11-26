function detect_browser() {
  if ( typeof InstallTrigger !== 'undefined' ) {
    console.log("Detected: Firefox");
    return browser;
  }
  else if ( !!window.chrome ) {
    console.log("Detected: Chrome");
    return chrome;
  }
}

var mybrowser = detect_browser();

function run_script_in_tab() {
	mybrowser.tabs.executeScript({
    file: 'get_songs.js'
  });
}
mybrowser.browserAction.onClicked.addListener(run_script_in_tab);
