/*
 * ==========================================================================
 * Copyright (c) 2018 by eeps media.
 * Last modified 8/21/18 8:32 AM
 *
 * Created by Tim Erickson on 8/21/18 8:32 AM
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

//  import codapInterface from "../common/codapInterface";

app.CODAPconnect = {

  initialize: async function (iCallback) {
    try {
      await codapInterface.init(this.iFrameDescriptor, null);
    } catch (e) {
      console.log('Error connecting to CODAP: ' + e);
      app.state = Object.assign({}, app.freshState);
      return;
    }
    await pluginHelper.initDataSet(this.ACSDataContextSetupObject);

    //  restore the state if possible

    app.state = await codapInterface.getInteractiveState();

    if (jQuery.isEmptyObject(app.state)) {
      await codapInterface.updateInteractiveState(app.freshState);
      console.log("app: getting a fresh state");
    }
    console.log("app.state is " + JSON.stringify(app.state));   //  .length + " chars");

    //  now update the iframe to be mutable...

    const tMessage = {
      "action": "update",
      "resource": "interactiveFrame",
      "values": {
        "preventBringToFront": false,
        "preventDataContextReorg": false
      }
    };

    const updateResult = await codapInterface.sendRequest(tMessage);

    app.ui.updateWholeUI();
  },

  logAction: function (iMessage) {
    codapInterface.sendRequest({
      action: 'notify',
      resource: 'logMessage',
      values: {
        formatStr: iMessage
      }
    });
  },
  saveCasesToCODAP: async function (iValues) {
    await this.makeNewAttributesIfNecessary();

    const makeItemsMessage = {
      action : "create",
      resource : "dataContext[" + app.constants.kACSDataSetName + "].item",
      values : iValues
    };

    const createItemsResult = await codapInterface.sendRequest(makeItemsMessage);
    return createItemsResult;
  },

  deleteAllCases: async function () {
    let theMessage = {
      action: 'delete',
      resource : "dataContext[" + app.constants.kACSDataSetName + "].allCases"
    };
    let result = await codapInterface.sendRequest(theMessage);
    return result;
  },

  makeNewAttributesIfNecessary : async function() {
    async function getCODAPAttrList() {
      let attrListResource = 'dataContext[' + app.constants.kACSDataSetName +
          ']';
      let response =
          await codapInterface.sendRequest({
        action: 'get',
        resource: attrListResource});
      if (response.success) {
        let attrArrays = response.values.collections.map(function (collection) {
          collection.attrs.forEach(function (attr) {
            attr.collectionID = collection.guid;
          });
          return collection.attrs;
        });
        return attrArrays.flat();
      }
    }

    let theAttributes = app.state.selectedAttributes.map(function (attrName) {
      return app.allAttributes[attrName];
    });
    let existingAttributeList = await getCODAPAttrList();
    let existingAttributeNames = existingAttributeList.map(function (attr) {
      return attr.title;
    });
    let codapRequests = [];

    theAttributes.forEach(function (attr) {
      if (!existingAttributeNames.includes(attr.title)) {
        let attrResource = 'dataContext[' + app.constants.kACSDataSetName + '].collection['
            + app.constants.kACSCollectionName + '].attribute';
        let req = {
          action: 'create',
          resource: attrResource,
          values: {
            name: attr.title,
            title: attr.title,
            description: attr.description,
            type: attr.format,
            formula: attr.formula
          }
        };
        if (attr.hasCategoryMap) {
          req.values._categoryMap = attr.getCategoryMap();
        }
        codapRequests.push(req);
      }
    });
    if (app.state.priorAttributes) {
      app.state.priorAttributes.forEach(function (attrName) {
        if (!app.state.selectedAttributes.includes(attrName)) {
          let codapAttr = existingAttributeList.find(function (cAttr) {return attrName === cAttr.name;});
          if (codapAttr) {
            let attrResource = 'dataContext[' + app.constants.kACSDataSetName +
                '].collection[' + codapAttr.collectionID + '].attribute[' + codapAttr.name + ']';
            let req = {
              action: 'delete', resource: attrResource
            };
            codapRequests.push(req);
          }
        }
      });
    }
    app.state.priorAttributes = app.state.selectedAttributes.slice();
    if (codapRequests.length > 0) {
      return await codapInterface.sendRequest(codapRequests);
    } else {
      return {success: true};
    }
  },

  makeCaseTableAppear : async function() {
    const theMessage = {
      action : "create",
      resource : "component",
      values : {
        type : 'caseTable',
        dataContext : app.constants.kACSDataSetName,
        name : app.constants.kACSCaseTableName,
        cannotClose : true
      }
    };

    const makeCaseTableResult = await codapInterface.sendRequest(theMessage);
    if (makeCaseTableResult.success) {
      console.log("Success creating case table: " + theMessage.title);
    } else {
      console.log("FAILED to create case table: " + theMessage.title);
    }

  },

  ACSDataContextSetupObject: {
    name: app.constants.kACSDataSetName,
    title: app.constants.kACSDataSetTitle,
    description: 'ACS portal',
    collections: [
      {
        name: app.constants.kACSCollectionName,
        labels: {
          singleCase: "person",
          pluralCase: "people",
          setOfCasesWithArticle: "a sample of people"
        },

        attrs: [ // note how this is an array of objects.
          {name: "sample", type: 'categorical', description: "sample number"},
        ]
      }
    ]
  },


  iFrameDescriptor: {
    version: app.constants.version,
    name: 'sdlc',
    title: 'USS Data Portal',
    dimensions: {width: 444, height: 555},
    preventDataContextReorg: false,
    cannotClose: true
  }
};