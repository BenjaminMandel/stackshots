#!/usr/bin/env node
var fs = require('fs'),
    version = JSON.parse(fs.readFileSync(__dirname + '/../package.json', 'utf8')).version,
    browserscreenshot = require('../'),
    async = require('async'),
    optimist = require('optimist');

// Validation arrays
var orientations = ['portrait','landscape'];

var argv = optimist
  .usage('browserscreenshot '+version+'\nUsage: $0 [opts]')
  .demand(['u','k'])
  .alias('u','username')
  .describe('u', 'The email you use to log in to Browserstack')
  .alias('k','accesskey')
  .describe('k', 'Your api access key')
  .alias('w','website')
  .describe('w', 'The website(s) from which you want to get screenshots. Comma separated list')
  .alias('b','browser')
  .default('b','IE_8,IE_9,Chrome,Firefox')
  .describe('b', 'The browser(s) from which you want to get screenshots. Comma separated list')
  .alias('o','orientation')
  .describe('o', 'Orientation of the device (portrait|landscape).')
  .default('o','portrait')
  .alias('s','os')
  .describe('s', 'Operating System of the browser separating version with underscore (windows_xp). Comma separated list')
  .default('s', 'windows_7')
  .alias('d','device')
  .describe('d', 'The device(s) from which you want to get screenshots. Comma separated list')
  //resolutions
  .alias('wr','winres')
  .describe('wr', 'windows resolution')
  .default('wr', '1280x1024')
  .alias('mr','macres')
  .describe('mr', 'macos resolution')
  .default('mr', '1920x1080')  
  ///resolutions
  .alias('f', 'folder')
  .describe('f', 'Folder in which screenshots will be stored')
  .default('f', process.cwd())
  .alias('l','ls')
  .describe('l','Instead of getting images, it will output a list of browsers and OS available')
  .boolean('l')
  .alias('t','tunnel')
  .describe('t','Enable tunnel support')
  .boolean('t')
  .alias('h','help')
  .describe('h', 'Shows help info')
  .check(function(argv){
    if (orientations.indexOf(argv.orientation) === -1){
      throw new Error('Orientation has to be one of this values ' + orientations.join('|'));
    }
  })
  .argv;

if (argv.help) {
  return optimist.showHelp(function(help) {
    console.log(help);
  });
}

var candidateBrowsers = argv.browser.toLowerCase().split(','),
    os = argv.os ? argv.os.toLowerCase().split(',') : null,
    devices = argv.device ? argv.device.toLowerCase().split(',') : null;

var client = new browserscreenshot({
  email : argv.username,
  password : argv.accesskey,
  folder : argv.folder
}, function(){
  if (argv.l){
    for (var browser in client.browsers){
      if (client.browsers.hasOwnProperty(browser)) {
        var versions = [];
        console.log('Browser: %s', browser);
        console.log('OS: %s', client.browsers[browser].os.join(', '));
        for (var i = 0, c = client.browsers[browser].list.length; i < c; i++) {
          var version = client.browsers[browser].list[i];
          var browserVersion = version.browser_version || version.os_version;
          if (versions.indexOf(browserVersion) === -1){
            versions.push(browserVersion);
          }
        }
        console.log('Versions: %s', versions.join(', '));
        console.log('');
      }
    }
  }
  else {
    var preparedOS = client.prepareOS(os),
        browsers = client.guessBrowsers(candidateBrowsers,preparedOS.os,preparedOS.osVersions, devices),
        urls = argv.website ? argv.website.split(',') : null, functions = [];

    if (!browsers){
      throw new Error('Invalid browsers supplied');
    }
    else {
      if (urls){
        urls.forEach(function(url){
          functions.push(function(cb){
            var request = {
              url : url,
              orientation : argv.orientation,
              win_res : argv.wr,
              mac_res : argv.mr,
              browsers : browsers,
              tunnel: argv.tunnel
            };
            console.log('Requesting images for %s', url);
            client.getImages(request,cb);
          });
        });

        async.series(functions,function(){
          console.log('All urls have been downloaded into "%s"!', client.destinationFolder);
        });
      }
      else {
        console.log('Since you provided no websites, I asume that you want to tests browser matching');
        console.log(browsers);
      }
    }
  }
});
