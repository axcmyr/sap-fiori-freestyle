sap.ui.define([], function () {
    "use strict";

    return {

        /**
         * Rounds the number unit value to 2 digits
         * @public
         * @param {string} sValue the number string to be rounded
         * @returns {string} sValue with 2 digits rounded
         */
        numberUnit: function (sValue) {
            if (!sValue) {
                return "";
            }
            return parseFloat(sValue).toFixed(2);
        },

        /**
         * Returns stock status text based on stock level
         * @public
         * @param {number} iStock the stock level
         * @returns {string} status text
         */
        stockStatus: function (iStock) {
            if (!iStock || iStock === 0) {
                return "Out of Stock";
            } else if (iStock <= 10) {
                return "Low Stock";
            } else {
                return "In Stock";
            }
        },

        /**
         * Returns stock status state for ObjectStatus
         * @public
         * @param {number} iStock the stock level
         * @returns {string} state (Success, Warning, Error)
         */
        stockState: function (iStock) {
            if (!iStock || iStock === 0) {
                return "Error";
            } else if (iStock <= 10) {
                return "Warning";
            } else {
                return "Success";
            }
        },

        /**
         * Returns availability text
         * @public
         * @param {boolean} bAvailable availability status
         * @returns {string} availability text
         */
        availabilityText: function (bAvailable) {
            return bAvailable ? "Available" : "Not Available";
        },

        /**
         * Returns availability state
         * @public
         * @param {boolean} bAvailable availability status
         * @returns {string} state
         */
        availabilityState: function (bAvailable) {
            return bAvailable ? "Success" : "Error";
        },

        /**
         * Returns icon based on category
         * @public
         * @param {string} sCategory product category
         * @returns {string} icon name
         */
        categoryIcon: function (sCategory) {
            var icons = {
                "Dairy": "sap-icon://nutrition-activity",
                "Beverages": "sap-icon://cup",
                "Grains": "sap-icon://meal",
                "Proteins": "sap-icon://nutrition-activity",
                "Produce": "sap-icon://tree",
                "Snacks": "sap-icon://favorite",
                "Condiments": "sap-icon://meal"
            };
            return icons[sCategory] || "sap-icon://product";
        },

        /**
         * Formats date to readable string
         * @public
         * @param {Date} oDate the date
         * @returns {string} formatted date
         */
        formatDate: function (oDate) {
            if (!oDate) {
                return "";
            }
            var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
                pattern: "dd.MM.yyyy"
            });
            return oDateFormat.format(new Date(oDate));
        }

    };
});
