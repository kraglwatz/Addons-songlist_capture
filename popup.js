function detect_browser() {
  if ( chrome.runtime.getURL('').startsWith('moz-extension://') ) {
    return browser;
  }
  else if (chrome.runtime.getURL('').startsWith('chrome-extension://') ) {
    return chrome;
  }
  return null;
  if ( !!window.chrome ) {
    console.log("Detected: Chrome");
    return chrome;
  }
  else if ( typeof InstallTrigger !== 'undefined' ) {
    console.log("Detected: Firefox");
    return browser;
  }
}

var mybrowser = detect_browser();



function get_songs() {
  mybrowser.tabs.executeScript({file: 'get_songs.js'}).then(null,null);
}

function delete_entry(num) {
  mybrowser.storage.local.get('albumlist', function(data) {
    console.log("delete_entry:",num,Object.keys(data.albumlist).length);
    if ( num < Object.keys(data.albumlist).length ) {
      if ( num < 0 ) {
        for (let x of Object.keys(data.albumlist) ) {
          //console.log("delete:",x);
          delete data.albumlist[x];
        }
      }
      else {
        var del_key = Object.keys(data.albumlist)[num];
        //console.log("delete:",del_key);
        delete data.albumlist[del_key];
      }
      album_table(data.albumlist);
      mybrowser.storage.local.set({albumlist: data.albumlist}, function () { console.log("Successfully written"); });
    }
  });
}

function change_entry(num,changes) {
  mybrowser.storage.local.get('albumlist', function(data) {
    console.log("change_entry:",num,changes,Object.keys(data.albumlist).length);
    if ( num>=0 && num < Object.keys(data.albumlist).length ) {
      var change_key = Object.keys(data.albumlist)[num];
      Object.assign(data.albumlist[change_key],changes);
      album_table(data.albumlist);
      mybrowser.storage.local.set({albumlist: data.albumlist}, function () { console.log("Successfully written"); });
    }
  });
}

class add_edit_field {
  constructor(element,id,value,classes="",list="",html="") {
    this.id = id;
    this.editible = false;
    console.log("add_edit_field:",id);
    element.innerHTML = `<input class="${classes}" id="edit_${id}" list="${list}" style="display:none;" value="${value}"/ >
                <div id="${id}" class="${classes}" style="display:inline">${value}</div>`+html;
    var self = this;
    element.addEventListener("click",function() { console.log(`click "${self.id}":`); self.set_editible(); });
    //document.getElementById("edit_"+id).addEventListener("click",function() { console.log(`click "edit_${id}":`); self.set_ineditible(); });
  }
  set_editible() {
    console.log("set_editible");
    document.getElementById("edit_"+this.id).setAttribute("style","display:inline");
    document.getElementById(this.id).setAttribute("style","display:none");
    this.editible = true;
  }
  set_ineditible() {
    console.log("set_ineditible");
    document.getElementById("edit_"+this.id).setAttribute("style","display:none");
    document.getElementById(this.id).setAttribute("style","display:inline");
    this.editible = false;
  }
  toggle() {
    if ( this.editible ) { this.set_ineditible(); }
    else { this.set_ineditible(); }
  }
  get_value() {
    console.log("get value: ","edit_"+this.id);
    return document.getElementById("edit_"+this.id).value;
  }
  addEventListener(event,closure) {
    document.getElementById("edit_"+this.id).addEventListener(event,closure);
  }
  addKeyEvents(key_events) {
    var self = this;
    document.getElementById("edit_"+this.id).addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        self.set_ineditible();
      }
      else {
        for (let k of Object.keys(key_events) ) {
          if ( e.key == k ) {
            key_events[k]();
            break;
          }
        }
      }
    });
  }
}

function album_table(items) {
  var table = document.getElementById("albumlist");
  var max_entries = table.rows.length;
  var album_keys = Object.keys(items);
  var entries = [];
  for (let i in album_keys) {
      var album = album_keys[i];
      var row;
      console.log(album);
      if ( i<max_entries ) {
        row = table.rows[i];
      }
      else {
        row = table.insertRow();
        row.insertCell(0);
        row.insertCell(1);
        //var genre = row.insertCell(2).createElement("INPUT");
        //genre.setAttribute("type","text");
        //genre.setAttribute("value",items[album].genre);
        row.insertCell(2);
        row.insertCell(3);
        row.insertCell(4);
      }
      console.debug(row.cells);
      row.cells[0].innerHTML = `<div style="text-align: center">${parseInt(i)+1}</div>`;
      row.cells[1].innerHTML = album;
      row.cells[2].innerHTML = items[album].tracks.length;
      entries[i] = new add_edit_field(row.cells[3],"genre_"+i,items[album].genre,
              classes="genre",
              list="genres",
              html=`<datalist id="genres">
                <option value="Pop">
                <option value="Rock">
                <option value="Schlager">
                <option value="Country">
                <option value="Classical">
                <option value="Comedy">
              </datalist>`);
      entries[i].addKeyEvents({'Enter': function () {
          entries[i].set_ineditible();
          console.debug("change: ",entries[i].get_value());
          change_entry(i,{genre: entries[i].get_value() });
        }
      });
      row.cells[4].innerHTML = `<a id="delete_${i}"><div  class="w3-small w3-text-red"><i class="material-icons">close</i></div></a>`;
      document.getElementById("delete_"+i).addEventListener("click",function() { delete_entry(i); });
  }
  for (let i = album_keys.length; i< max_entries; i++) {
    table.deleteRow(album_keys.length);
  }
}

function albumlist() {
  console.log("call albumlist:");
  mybrowser.storage.local.get('albumlist', function(data) {
    console.debug("data:",data.albumlist);
    if ( typeof data.albumlist != "undefined" ) {
      album_table(data.albumlist);
    }
  });
}

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
      if (request.msg === "successfully stored") {
          console.debug("message: ",request.data)
          albumlist();
      }
  }
);

function download(filename,text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

function generate_output(filename) {
  mybrowser.storage.local.get('albumlist', function(data) {
    console.debug("data:",data.albumlist);
    if ( typeof data.albumlist != "undefined" ) {
      var album_keys = Object.keys(data.albumlist);
      console.debug(album_keys);
      var text = "";
      for (let key of album_keys) {
        console.debug("key: ",key);
        var album = data.albumlist[key];
        console.debug(album);
        text += "#url=|album="+album.title+"|albumartist="+album.albumartist+"|genre="+album.genre+"|cover="+album.artwork+"\n";
        for (let song of album.tracks) {
          text += song.discnumber+"|"+song.trackno+"|"+song.title+"|"+song.artist+"|"+song.duration+"|"+album.albumartist+"|"+album.title+"|"+album.year+"|"+album.genre+"|"+song.popularity+"|"+song.artwork+"\n";
        }
      }
      download(filename,text);
    }
  });
}


albumlist();
document.getElementById("add_album").addEventListener("click",get_songs);
document.getElementById("delete_all").addEventListener("click",function () {
  var answer = confirm("Sure to delete all entries?");
  console.debug("answer:",answer);
  if ( answer ) { delete_entry(-1); }
});
document.getElementById("download").addEventListener("click",function () {
  console.debug("download:");
  generate_output("albumlist.txt");
});
