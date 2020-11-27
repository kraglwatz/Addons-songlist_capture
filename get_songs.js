
function getElementsByXPath(xpath, parent)
{
    let results = [];
    let query = document.evaluate(xpath, parent || document,
        null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (let i = 0, length = query.snapshotLength; i < length; ++i) {
        results.push(query.snapshotItem(i));
    }
    return results;
}

function getFirstElementByXPath(xpath, parent)
{
	var elements = getElementsByXPath(xpath,parent);
	if ( elements.length>0 ) {
		console.log(elements[0]);
		return elements[0];
	}
	return null;
}

function getAttributeByXPath(xpath, parent,def = null)
{
	var elements = getElementsByXPath(xpath,parent);
	if ( elements.length>0 ) {
		return elements[0].value;
	}
	return def;
}

function getContentByXPath(xpath, parent,def = null)
{
	var elements = getElementsByXPath(xpath,parent);
	if ( elements.length>0 ) {
		return elements[0].textContent;
	}
	return def;
}

convert = {
	time: function(d) {
		if ( Number.isInteger(d) && d>1000 ) {
			return int(d/1000+0.5);
		}
		else {
			var s = d.split(":");
			if (s.length > 1) {
				return parseInt(s[0])*60+parseInt(s[1]);
			}
			else {
				return s;
			}
		}
	},
	date: function(d) {
		d = d.replace(/.*,\s*/,"");
		return d;
	}
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * scroll smoothly to a element in the DOM.
 * @param elem element to scroll to
 * @param offset int offset pixels from element (default is 0)
 * @returns promise that gets resolved when scrolling is complete
 */
function smoothScroll(elem, offset = 0) {
	const rect = elem.getBoundingClientRect();
	let targetPosition = rect.top + self.pageYOffset + offset;
	window.scrollTo({
	  top: targetPosition,
	  behavior: 'smooth'
	});

	return new Promise((resolve, reject) => {
	  const failed = setTimeout(() => {
		reject();
	  }, 2000);

	  const scrollHandler = () => {
		if (self.pageYOffset === targetPosition) {
		  window.removeEventListener("scroll", scrollHandler);
		  clearTimeout(failed);
		  resolve();
		}
	  };
	  if (self.pageYOffset === targetPosition) {
		clearTimeout(failed);
		resolve();
	  } else {
		window.addEventListener("scroll", scrollHandler);
	  }
	});
  }


onleihe = {
	get_songlist: new Promise( function (resolve) {
		var data = {
			artwork: getAttributeByXPath("//div[@id='coverImage']//img/@src"),
			year: "",
			genre: ""
		}
		var info = getElementsByXPath("//div[@class='item-info']/div[@class='m-row']");
		for (let i=0; i<info.length; i++) {
			var key = getContentByXPath("div[@class='item-2']",info[i],"").replace(/:.*/,"");
			var value = getContentByXPath("div[@class='item-3']",info[i],"").replace(/\s*$/,"");
			data[key] = value;
		}
		data.albumartist = data.Autor || data.Sprecher || "";
		var tracklist = getElementsByXPath("//table[@class='tracklist']/tbody/tr");
		var tracks = [];
		for (let i=0; i<tracklist.length; i++) {
			var track = {
				discnumber: 0,
				trackno: parseInt(getContentByXPath("td[1]",tracklist[i])),
				duration: convert.time(getContentByXPath("td[3]",tracklist[i])),
				artist: data.albumartist,
				title: getContentByXPath("td[2]",tracklist[i]),
				artwork: data.artwork,
				popularity: 0
			}
			data.title = track.title;
			tracks.push(track);
		}
		data.tracks = tracks;
		console.debug("data: ",data);
		resolve(data);
	})
}
amazon = {
	get_track: function(el) {
		var p1 = getAttributeByXPath("@primary-text",el);
		var p2 = getAttributeByXPath("@secondary-text-1",el,"");
		var p3 = getAttributeByXPath("@secondary-text-2",el,"");
		var p4 = getAttributeByXPath("@secondary-text",el,"");
		var img = getAttributeByXPath("@image-src",el,null);
		var popularity = getAttributeByXPath(".//music-popularity-bar/@rating",el,0)/getAttributeByXPath(".//music-popularity-bar/@max-rating",el,10);
		var trackno = parseInt(getContentByXPath("./span[@class='index']",el,0));
		var duration = getAttributeByXPath(".//div[@class='col4']/music-link/@title",el,null);
		console.debug("info: ",p1,p2,img,popularity,el);
		console.debug("info2: ",trackno,duration);
		var track = {
			discnumber: 0,
			trackno: trackno,
			duration: duration ? convert.time(duration) : 0,
			title: p1,
			artist: p3,
			album: p2,
			artwork: img,
			popularity: popularity
		}
		console.debug("track:",track);
		return track
	},
	get_songlist: new Promise( function(resolve) {
		smoothScroll(document.querySelector("music-detail-header")).then(() => {
			pgsize = window.screen.availHeight;
			console.debug("pgsize:",pgsize);
			var details = getFirstElementByXPath("//music-detail-header");
			if (details != null ) {
				var tertiary = getAttributeByXPath("@tertiary-text",details,"");
				var vals = tertiary.split(" • ");
				var ntracks = parseInt(vals[0].replace(/s*Songs.*/i,""));
				var data = {
					type: getAttributeByXPath("@label",details),
					artwork: getAttributeByXPath("@image-src",details),
					title: getAttributeByXPath("@headline",details),
					albumartist: getAttributeByXPath("@secondary-text",details,"Various Artists"),
					year: vals.length == 3 ? convert.date(vals[2].replace(/.*•\s*/,"")) : "",
					genre: "",
					tracks: []
				}
				console.debug("data:",ntracks,data);
				var container = getFirstElementByXPath("//music-container");
				var tracks = {};
				var last_track = 0;
				var c=50;
				gather_parts = function (finalize = false) {
					console.debug("get_parts:",c,last_track,finalize);
					c -= 1;
					sleep(500).then( () => {
						var songs = getElementsByXPath("//music-container//music-text-row");
						if (songs.length == 0 ) {
							songs = getElementsByXPath("//music-container//music-image-row");
						}
						console.debug("songs:",songs);
						for (let i=0; i<songs.length; i++) {
							var track = amazon.get_track(songs[i]);
							last_track = track.trackno;
							tracks[track.trackno] = track;
						}
						console.debug("page:",c,last_track,ntracks,songs.length);
						if ( c>0 && last_track<ntracks && ! finalize ) {
							smoothScroll(songs[songs.length -1]).then( () => { gather_parts() } ).catch( (err) => { gather_parts(true); } );
						}
						else {
							for (var x in tracks) {
								data.tracks.push(tracks[x]);
							}
							console.debug("c,data2:",c,data);
							resolve(data);
						}
					});
				}
				gather_parts();
			}

		});
	})
}

 getSongList = new Promise(function (resolve) {
	 console.debug("getSongList");
	var title = getContentByXPath("//html/head/title");
	console.log("title:",title);
	if (  title == "Onleihe Player" ) { // onleihe.de
		console.log("Found onleihe.de");
		resolve(onleihe.get_songlist());
	}
	else if (  title.indexOf("Prime Music")>=0 ) { // music.amazon.de
		console.log("Found music.amazon.de");
		resolve(amazon.get_songlist);
	}
	resolve(null);
});

getSongList.then( function (songlist) {
	console.log('songlist:',songlist);
	var ok = false;
	if ( songlist != null ) {
		browser.storage.local.get('albumlist', function(data) {
			console.debug("get data:",data);
			var fulllist = data.albumlist || {};
			var key = songlist.albumartist + " - " + songlist.title;
			console.debug('get list: ',fulllist, typeof fulllist[key] == "undefined");
			if ( typeof fulllist[key] == "undefined" ) {
				fulllist[key] = songlist;
				browser.storage.local.set({albumlist: fulllist}, function() {
					console.log('Successfully stored: ',songlist);
					browser.runtime.sendMessage({
						msg: "successfully stored",
						data: songlist
					});
				});
				window.ok = true;
			}
		});
		ok;
	}
}
);
