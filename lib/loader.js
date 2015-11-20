var Factory = require('bdsft-sdk-factory');
var StylesManager = require('bdsft-sdk-styles');
module.exports = Loader;

function Loader(Widget, options) {
  var self = {};

  self.asScript = function(src, config, styles) {
    var script = '<script src="' + src + '" ';
    var dataStrs = Object.keys(styles || {}).map(function(key) {
      var value = styles[key];
      return "data-" + key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase() + '="' + value + '"';
    });
    script += dataStrs.join(' ');
    script += '>\n' + (config && Object.keys(config).length ? JSON.stringify(config, undefined, 2) : '') + '\n</script>';
    return script;
  };

  var currentScript = document.currentScript;
  require('domready')(function () {
    // for mocha tests
    if(!currentScript) {
      return;
    }
    var configData = currentScript.innerText.trim() ? JSON.parse(currentScript.innerText) : {};
    console.log("script config : ", configData);

    var factoryOptions = getFactoryOptions(configData);
    window[factoryOptions.namespace] = window[factoryOptions.namespace] || {};
    window[factoryOptions.namespace].widgets = [];

    var styleData = currentScript.dataset;
    var src = currentScript.src;
    var widget = self.create(configData, styleData, src);
    widget.view.appendTo(currentScript.parentNode);
    currentScript.remove();
    window[factoryOptions.namespace].widgets.push(widget);
  });

  var getFactoryOptions = function(configData){
    var namespace = "bdsft_webrtc";
    return require('deep-extend')({namespace: namespace}, options, configData);
  };

  self.create = function create(configData, styleData, src) {
    var factoryOptions = getFactoryOptions(configData);
    var count = window[factoryOptions.namespace] && window[factoryOptions.namespace].widgets && window[factoryOptions.namespace].widgets.length;
    var id =  (!count || count === 0) && 'default' || 'webrtc'+count;
    factoryOptions.dependencies = require('deep-extend')({}, factoryOptions.dependencies);
    factoryOptions.styleData = styleData;
    factoryOptions.id = id;

    options && options.beforeCreateCb && options.beforeCreateCb(factoryOptions);
    var widget = Factory(factoryOptions)(Widget.view);

    var modules = function(){
      return (window[factoryOptions.namespace] || global[factoryOptions.namespace])[factoryOptions.id];
    }
    if(!widget.asScript) {
      widget.asScript = function(){
        var configs = {};
        for(var name in modules()) {
          var module = modules()[name];
          for(var className in module) {
            var object = module[className];
            var configChanges = object.configChanges && object.configChanges();
            if(configChanges && Object.keys(configChanges).length) {
              var changesObj = {};
              changesObj[name] = configChanges; 
              configs = Utils.extend(configs, changesObj);
            }
          }
        }
        return self.asScript(src, configs, StylesManager.changes());
      };
    }
    if(!widget.updateConfigs) {
      widget.updateConfigs = function(config){
        for(var name in modules()) {
          var module = modules()[name];
          for(var className in module) {
            var object = module[className];
            object.updateConfig && object.updateConfig(config && config[name] || config);
          }
        }
      };
    }
    if(!widget.updateStyles) {
      widget.updateStyles = function(styles){
        StylesManager.update(styles);
      };
    }
    return widget;
  }

  if (typeof String.prototype.endsWith !== 'function') {
    String.prototype.endsWith = function(suffix) {
      return this.indexOf(suffix, this.length - suffix.length) !== -1;
    };
  }

  return self;
}