/*
 * ==========================================================================
 * Copyright (c) 2018 by eeps media.
 * Last modified 8/21/18 9:10 AM
 *
 * Created by Tim Erickson on 8/21/18 9:10 AM
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS-IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 * ==========================================================================
 *
 */
/* global app */

app.ui = {

  updateWholeUI: function () {
    console.log('updating ui');
    app.ui.refreshAttributeCheckboxes();
    app.ui.refreshStateCheckboxes();
    app.ui.refreshYearCheckboxes();
    app.ui.refreshSampleSummary();
    app.ui.refreshText();
  },

  refreshText: function () {
    $('#keepExistingDataCheckbox')[0].checked = app.state.keepExistingData;
  },

  /**
   * Expects an array of attr names. Returns true if they are all selected.
   * @param dependents
   */
  checkDependentSelected: function (dependents) {
    return dependents.every(function (dep) {
      return (app.state.selectedAttributes.includes(dep));
    });
  },

  refreshAttributeCheckboxes: function () {
    let activeAttributes = app.state.selectedAttributes;
    $('#chooseAttributeDiv .select-item').prop('checked', false);
    if (activeAttributes) {
      activeAttributes.forEach(function (attrName) {
        $('#attr-' + attrName).prop('checked', true);
      });
    }

    Object.values(app.allAttributes).forEach(function (attr) {
      if (attr.formulaDependents) {
        let $el = $('#' + attr.checkboxID);
        if (!this.checkDependentSelected(attr.formulaDependents.split(','))) {
          $el.prop('checked', false);
          $el.prop('disabled', true);
        } else {
          $el.prop('disabled', false);
        }
      }
    }.bind(this));
  },

  refreshStateCheckboxes: function () {
    let activeStateCodes = app.state.selectedStates;
    $('#states .select-item, #states .select-all').prop('checked', false);
    if (!activeStateCodes || (activeStateCodes.length === 0)) {
      $('#state-all').prop('checked', true);
    } else {
      activeStateCodes.forEach(function (stateCode) {
        $('#state-' + stateCode).prop('checked', true);
      });
    }
  },

  refreshYearCheckboxes: function () {
    let activeYears = app.state.selectedYears;
    $('#sampleYears .select-item').prop('checked', false);
    if (activeYears) {
      activeYears.forEach(function (year) {
        $('#year-' + year).prop('checked', true);
      });
    }
  },

  toggleAttributeGroupOpen : function(iGroupIndex) {
      app.config.attributeGroups[iGroupIndex].open = !app.attributeGroups[iGroupIndex].open;
      app.ui.updateWholeUI();
  },

  displayStatus: function (message) {
    $('#status').text(message);
  },

  makeStateListHTML: function () {
    let out = '<div><input type="checkbox" id="state-all" class="select-all" checked="checked" />all states</div>';
    let stateAttribute = app.allAttributes.State;
    app.states.forEach(function (state) {
      let id = 'state-' + state.state_code;
      let name = stateAttribute.categories[state.state_code];
      out += '<div><input type="checkbox" id="' + id + '" class="select-item"/>' + name + '</div>';
    });
    return out;
  },

  makeYearListHTML: function () {
    function availablePresetsHTML(year) {
      let avail = app.presetStates && app.presetStates.find(function (st) {return st.yr == year;});
      if (avail) {
        return '<span class="presets-count">(' + avail.avail + ')</span>';
      } else {
        return '';
      }
    }
    let out = '';
    let checked = ' checked="checked"';
    app.years.forEach(function (year) {
      let id = 'year-' + year.year;
      out += '<div><input type="checkbox" id="' + id + '" class="select-item"'
          + checked + '/>' + year.year + availablePresetsHTML(year.year) + '</div>';
      checked = '';
    });
    return out;
  },

  makeBasicCheckboxesHTML: function () {
    let out = "";

    app.config.attributeGroups.forEach( (g)=>{
      out += "<details>";
      //if (g.open) {
          //  out += "<div>";

          out += this.makeOneGroupOfCheckboxesHTML(g);
          //  out += "</div>";
      //}
      out += "</details>";
    });

    return out;
  },

  makeOneGroupOfCheckboxesHTML: function (iGroupObject) {
    let out = "";
    out += "<summary>" + iGroupObject.title + "</summary>";

    out += "<div class='attributeCheckboxes'>";
    for (let attName in app.allAttributes) {

      if (app.allAttributes.hasOwnProperty(attName)) {
        const tAtt = app.allAttributes[attName];    //  the attribute
        if (tAtt.groupNumber == iGroupObject.number) {     //  not === because one may be a string
          if (tAtt.displayMe) {
            tAtt.hasCheckbox = true;        //  redundant
            out += "<div class='oneAttCheckboxPlusLabel'>";
            out += "<input class='select-item' type ='checkbox' id = '" + tAtt.checkboxID + "' >\n";
            out += "<label for='" + tAtt.checkboxID + "'><span class='attNameBold'>"
                + tAtt.title + "</span> " + tAtt.description + "</label>";
            out += "</div>\n";
          }
        }
      }
    }
    out += "</div>";
    return out;
  },


  refreshSampleSummary: function () {
    const tSampleSize = app.userActions.getSelectedSampleSize();
    const tNumPartitions = app.getPartitionCount();
    const tSurveys = app.state.selectedYears
        .map(function (year) {return (year % 10)?'acs':'census';})
        .reduce(function (acc, survey) { acc[survey] = true; return acc; }, {});
    const surveyMap = {
      acs: ' from the <a href=\'https://www.census.gov/programs-surveys/acs\' target=\'_blank\'>American Community Survey</a>.',
      census: ' from decennial census data.',
      'acs,census': ' from decennial census data and the <a href=\'https://www.census.gov/programs-surveys/acs\' target=\'_blank\'>American Community Survey</a>.',
      'none': '.'
    };


    let out = "";
    const stateAttr = app.allAttributes.State;
    let states = app.state.selectedStates.map(function (st) { return stateAttr.categories[Number(st)]; });
    const peepsPhrase = (tSampleSize == 1) ? "<b>one</b> random person" : "a random sample of <b>" + tSampleSize + "</b> people";
    const partitionPhrase = (tNumPartitions != 1) ? ' in <b>' + tNumPartitions + '</b> partitions': '';
    const surveyPhrase = surveyMap[Object.keys(tSurveys).sort().join()||'none'];

    if (states.length === 0) {states = ['all'];}


    out = "<p>When you press the button, you will get "
        + peepsPhrase + partitionPhrase + surveyPhrase
        + "<p>They will be drawn from the following states: <b>" + states.join('</b>, <b>') +
        "</b>, and the following years: <b>" + app.state.selectedYears.join('</b>, <b>')
        + "</b>.</p>"
        + "<p>The variables you will get are: "
        + "<b>" + app.state.selectedAttributes.join("</b>, <b>") + "</b>.</p>";

    document.getElementById("sampleSummaryDiv").innerHTML = out;
  }
};