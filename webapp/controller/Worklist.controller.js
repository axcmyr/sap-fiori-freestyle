sap.ui.define([
    "sap/fiori/freestyle/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/fiori/freestyle/model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter"
], function (BaseController, JSONModel, formatter, Filter, FilterOperator, Sorter) {
    "use strict";

    return BaseController.extend("sap.fiori.freestyle.controller.Worklist", {

        formatter: formatter,

        /* =========================================================== */
        /* lifecycle methods                                           */
        /* =========================================================== */

        /**
         * Called when the worklist controller is instantiated.
         * @public
         */
        onInit: function () {
            var oViewModel;

            // keeps the search state
            this._aTableSearchState = [];
            this._aTableFilterState = [];

            // Model used to manipulate control states
            oViewModel = new JSONModel({
                worklistTableTitle: this.getResourceBundle().getText("worklistTableTitle"),
                shareOnJamTitle: this.getResourceBundle().getText("worklistTitle"),
                shareSendEmailSubject: this.getResourceBundle().getText("shareSendEmailWorklistSubject"),
                shareSendEmailMessage: this.getResourceBundle().getText("shareSendEmailWorklistMessage", [location.href]),
                tableNoDataText: this.getResourceBundle().getText("tableNoDataText"),
                tableBusyDelay: 0
            });
            this.setModel(oViewModel, "worklistView");

        },

        /* =========================================================== */
        /* event handlers                                              */
        /* =========================================================== */

        /**
         * Triggered by the table's 'updateFinished' event: after new table
         * data is available, this handler method updates the table counter.
         * This should only happen if the update was successful, which is
         * why this handler is attached to 'updateFinished' and not to the
         * table's list binding.
         * @param {sap.ui.base.Event} oEvent the update finished event
         * @public
         */
        onUpdateFinished: function (oEvent) {
            // update the worklist's object counter after the table update
            var sTitle,
                oTable = oEvent.getSource(),
                iTotalItems = oEvent.getParameter("total");
            // only update the counter if the length is final and
            // the table is not empty
            if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
                sTitle = this.getResourceBundle().getText("worklistViewTitle", [iTotalItems]);
            } else {
                sTitle = this.getResourceBundle().getText("worklistTableTitle");
            }
            this.getModel("worklistView").setProperty("/worklistTableTitle", sTitle);
        },

        /**
         * Event handler when a table item gets pressed
         * @param {sap.ui.base.Event} oEvent the table selectionChange event
         * @public
         */
        onPress: function (oEvent) {
            // The source is the list item that got pressed
            this._showObject(oEvent.getSource());
        },

        /**
         * Event handler for navigating back.
         * We navigate back in the browser history
         * @public
         */
        onNavBack: function () {
            // eslint-disable-next-line sap-no-history-manipulation
            history.go(-1);
        },


        onSearch: function (oEvent) {
            if (oEvent.getParameters().refreshButtonPressed) {
                // Search field's 'refresh' button has been pressed.
                // This is visible if you select any master list item.
                this.onRefresh();
            } else {
                var aTableSearchState = [];
                var sQuery = oEvent.getParameter("query");

                if (sQuery && sQuery.length > 0) {
                    // Search in both Name and Description fields
                    aTableSearchState = [
                        new Filter({
                            filters: [
                                new Filter("Name", FilterOperator.Contains, sQuery),
                                new Filter("Description", FilterOperator.Contains, sQuery)
                            ],
                            and: false // OR logic
                        })
                    ];
                }
                this._aTableSearchState = aTableSearchState;
                this._applyFilters();
            }

        },

        /**
         * Event handler for category filter
         * @param {sap.ui.base.Event} oEvent the selection change event
         * @public
         */
        onCategoryFilter: function (oEvent) {
            var sKey = oEvent.getParameter("selectedItem").getKey();
            var aFilters = [];

            if (sKey) {
                aFilters.push(new Filter("Category", FilterOperator.EQ, sKey));
            }

            this._sCategoryFilter = sKey;
            this._applyFilters();
        },

        /**
         * Event handler for stock filter
         * @param {sap.ui.base.Event} oEvent the selection change event
         * @public
         */
        onStockFilter: function (oEvent) {
            var sKey = oEvent.getParameter("item").getKey();
            var aFilters = [];

            if (sKey === "inStock") {
                aFilters.push(new Filter("Stock", FilterOperator.GT, 10));
            } else if (sKey === "lowStock") {
                aFilters.push(new Filter({
                    filters: [
                        new Filter("Stock", FilterOperator.GT, 0),
                        new Filter("Stock", FilterOperator.LE, 10)
                    ],
                    and: true
                }));
            } else if (sKey === "outOfStock") {
                aFilters.push(new Filter("Stock", FilterOperator.EQ, 0));
            }

            this._aStockFilter = aFilters;
            this._applyFilters();
        },

        /**
         * Event handler for available filter
         * @param {sap.ui.base.Event} oEvent the select event
         * @public
         */
        onAvailableFilter: function (oEvent) {
            var bSelected = oEvent.getParameter("selected");
            var aFilters = [];

            if (bSelected) {
                aFilters.push(new Filter("Available", FilterOperator.EQ, true));
            }

            this._aAvailableFilter = aFilters;
            this._applyFilters();
        },

        /**
         * Event handler for group button
         * @public
         */
        onGroup: function () {
            var oView = this.getView();

            if (!this._pGroupDialog) {
                this._pGroupDialog = sap.ui.core.Fragment.load({
                    id: oView.getId(),
                    name: "sap.fiori.freestyle.view.GroupDialog",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }

            this._pGroupDialog.then(function (oDialog) {
                oDialog.open();
            });
        },

        /**
         * Event handler for group dialog confirm
         * @param {sap.ui.base.Event} oEvent the confirm event
         * @public
         */
        onGroupDialogConfirm: function (oEvent) {
            var oTable = this.byId("table"),
                mParams = oEvent.getParameters(),
                oBinding = oTable.getBinding("items"),
                sPath,
                bDescending,
                vGroup,
                aGroups = [];

            if (mParams.groupItem) {
                sPath = mParams.groupItem.getKey();
                bDescending = mParams.groupDescending;
                vGroup = this._mGroupFunctions[sPath];
                aGroups.push(new Sorter(sPath, bDescending, vGroup));
                oBinding.sort(aGroups);
            } else {
                oBinding.sort([]);
            }
        },

        /**
         * Event handler for refresh event. Keeps filter, sort
         * and group settings and refreshes the list binding.
         * @public
         */
        onRefresh: function () {
            var oTable = this.byId("table");
            oTable.getBinding("items").refresh();
        },

        onAdd: function () {
            var oView = this.getView();
            var oModel = this.getModel();

            // create dialog lazily
            if (!this._pCreateDialog) {
                this._pCreateDialog = sap.ui.core.Fragment.load({
                    id: oView.getId(),
                    name: "sap.fiori.freestyle.view.CreateEntity",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }

            this._pCreateDialog.then(function (oDialog) {
                var oContext = oModel.createEntry("/Products", {
                    properties: {
                        ID: Math.floor(Math.random() * 10000), // simple random ID for mock
                        ReleaseDate: new Date()
                    }
                });
                oDialog.setBindingContext(oContext);
                oDialog.open();
            });
        },

        onSaveCreate: function () {
            var oModel = this.getModel();
            oModel.submitChanges({
                success: function () {
                    sap.m.MessageToast.show("Product created");
                },
                error: function () {
                    sap.m.MessageToast.show("Error creating product");
                }
            });
            this.byId("createDialog").close();
        },

        onCancelCreate: function () {
            var oModel = this.getModel();
            oModel.resetChanges(); // discard new entry
            this.byId("createDialog").close();
        },

        /* =========================================================== */
        /* internal methods                                            */
        /* =========================================================== */

        /**
         * Shows the selected item on the object page
         * On phones a additional history entry is created
         * @param {sap.m.ObjectListItem} oItem selected Item
         * @private
         */
        _showObject: function (oItem) {
            this.getRouter().navTo("object", {
                objectId: oItem.getBindingContext().getProperty("ID")
            });
        },

        /**
         * Internal helper method to apply all filters together on the list binding
         * @private
         */
        _applyFilters: function () {
            var oTable = this.byId("table"),
                oViewModel = this.getModel("worklistView"),
                aFilters = [];

            // Combine all filter arrays
            aFilters = aFilters.concat(this._aTableSearchState || []);

            if (this._sCategoryFilter) {
                aFilters.push(new Filter("Category", FilterOperator.EQ, this._sCategoryFilter));
            }

            if (this._aStockFilter && this._aStockFilter.length > 0) {
                aFilters = aFilters.concat(this._aStockFilter);
            }

            if (this._aAvailableFilter && this._aAvailableFilter.length > 0) {
                aFilters = aFilters.concat(this._aAvailableFilter);
            }

            oTable.getBinding("items").filter(aFilters, "Application");

            // changes the noDataText of the list in case there are no filter results
            if (aFilters.length !== 0) {
                oViewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("worklistNoDataWithSearchText"));
            }
        },

        /**
         * Group functions for different grouping options
         * @private
         */
        _mGroupFunctions: {
            "Category": function (oContext) {
                var sCategory = oContext.getProperty("Category");
                return {
                    key: sCategory,
                    text: sCategory
                };
            },
            "Supplier": function (oContext) {
                var sSupplier = oContext.getProperty("Supplier");
                return {
                    key: sSupplier,
                    text: sSupplier
                };
            },
            "StockStatus": function (oContext) {
                var iStock = oContext.getProperty("Stock");
                var sStatus;
                if (iStock === 0) {
                    sStatus = "Out of Stock";
                } else if (iStock <= 10) {
                    sStatus = "Low Stock";
                } else {
                    sStatus = "In Stock";
                }
                return {
                    key: sStatus,
                    text: sStatus
                };
            }
        }

    });
});
