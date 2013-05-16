// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview Merge matches from contained RegExpSelectors
 * to control TrackSelector visiblility.
 */
base.requireStylesheet('tracing.tracks.track_selector');
base.require('ui');
base.require('ui.regexp_selector');
base.exportTo('tracing.tracks', function() {

  /**
   * @constructor
   */
  var TrackSelector = ui.define('div');
  TrackSelector.prototype = {
    __proto__: HTMLDivElement.prototype,

    decorate: function() {
      this.className = 'track-selector';

      this.showHiddenTracksButton_ = this.createshowHiddenTracksButton_();
      this.appendChild(this.showHiddenTracksButton_);

      this.model = [
        {regexp: 'Renderer', isOn: false},
        {regexp: null, isOn: false}
      ];

      this.createRegExpSelectors_();
    },

    connect: function() {
      this.timelineView_ = this.findAncestorByClass_('timeline-view');
      if (!this.timelineView_)
        return; // Our parent is not in the DOM, maybe test-code.

      this.showHiddenTracksButton_.addEventListener(
          'click',
          this.onShowHiddenTracks_.bind(this)
      );

      this.timelineView_.addEventListener(
          'isOnChange',
          this.onTrackButtonIsOnChange_.bind(this)
      );

      this.timelineView_.addEventListener(
          'modelChange',
          this.onTrackModelChange_.bind(this)
      );

      this.addEventListener(
          'isOnChange',
          this.onRegExpSelected_.bind(this)
      );

      this.addEventListener(
          'modelChange',
          this.onSelectorsModelChange_.bind(this)
      );
    },

    findAncestorByClass_: function(className) {
      var element = this;
      while (element = element.parentElement) {
        if (element.classList.contains(className))
          return element;
      }
    },

    onTrackModelChange_: function() {
      var trackItems = [];
      var trackButtons =
          this.timelineView_.querySelectorAll('.track-button');
      for (var i = 0; i < trackButtons.length; i++) {
        var track = trackButtons[i].parentElement;
        var selector = '.first-visible-child > .canvas-based-track-title';
        var title = track.querySelector(selector);
        trackItems.push({text: title.textContent, data: trackButtons[i]});
      }
      this.selectors_.forEach(function(selector) {
        selector.clearItems();
        trackItems.forEach(function(item) {
          selector.addFilterableItem(item.text, item.data);
        });
      });
    },

    createshowHiddenTracksButton_: function() {
      var showHiddenTracksButton_ = document.createElement('button');
      showHiddenTracksButton_.className = 'show-hidden-tracks-button';
      showHiddenTracksButton_.textContent = 'Show Hidden Tracks';
      showHiddenTracksButton_.disabled = true;
      showHiddenTracksButton_.hiddenTracks_ = 0;

      return showHiddenTracksButton_;
    },

    onSelectorsModelChange_: function(event) {
      if (this.selectors_) {
        this.selectors_.forEach(function(selector) {
          this.removeChild(selector);
        }.bind(this));
      }
      this.createRegExpSelectors_();
      this.onTrackModelChange_();
      this.onItemsChange_();
    },

    createRegExpSelectors_: function() {
      this.selectors_ = this.model.map(this.createRegExpSelector_.bind(this));
    },

    createRegExpSelector_: function(selectorModel) {
      var regExpSelector = new ui.RegExpSelector();

      if (selectorModel.regexp) {
        regExpSelector.regexp = new RegExp(selectorModel.regexp);
        if (selectorModel.isOn)
          regExpSelector.isOn = selectorModel.isOn;
      }

      regExpSelector.addEventListener(
        'itemsChange',
        this.onItemsChange_.bind(this)
      );

      this.appendChild(regExpSelector);
      return regExpSelector;
    },

    onItemsChange_: function() {
      var mergedItems;
      this.selectors_.forEach(function(selector) {
          if (selector.isOn) {
            var items = selector.items;
            if (mergedItems)
              mergedItems = this.mergeItems_(mergedItems, items);
            else
              mergedItems = this.convertItems_(items);
          }
      }.bind(this));

      if (mergedItems)
        this.applySelection_(mergedItems);
      else
        this.onShowHiddenTracks_();
    },

    mergeItems_: function(mergedItems, items) {
      items.forEach(function(item, index) {
        mergedItems[index].matches =
            mergedItems[index].matches || items[index].matches;
      });
      return mergedItems;
    },

    convertItems_: function(items) {
      return items.map(function(item) {
        return {text: item.text, element: item.data, matches: item.matches};
      });
    },

    applySelection_: function(items) {
      items.forEach(function(item) {
        item.element.isOn = item.matches;
      });
    },

    onShowHiddenTracks_: function(event) {
      var trackButtons = this.timelineView_.querySelectorAll('.track-button');
      for (var i = 0; i < trackButtons.length; i++) {
        trackButtons[i].isOn = true;
      }
      this.selectors_.forEach(function(selector) {
        selector.isOn = false;
      });
    },

    onTrackButtonIsOnChange_: function(event) {
      if (!event.target.classList.contains('track-button'))
        return;

      // track-button isOn controls track visibility
      if (event.newValue)
        this.showHiddenTracksButton_.hiddenTracks_--;
      else
        this.showHiddenTracksButton_.hiddenTracks_++;

      this.showHiddenTracksButton_.disabled =
          (this.showHiddenTracksButton_.hiddenTracks_ === 0);
    },

    onRegExpSelected_: function(event) {
      if (!event.target.classList.contains('regexp-selector'))
        return;
      this.onItemsChange_();
    }

  };

  // Input, array of {regexp: RegExp, isOn: boolean}
  base.defineProperty(TrackSelector, 'model', base.PropertyKind.JS);

  return {
    TrackSelector: TrackSelector
  };
});