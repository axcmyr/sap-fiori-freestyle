sap.ui.define([
    "sap/ui/core/util/MockServer",
    "sap/ui/model/json/JSONModel",
    "sap/base/Log",
    "sap/base/util/UriParameters"
], function (MockServer, JSONModel, Log, UriParameters) {
    "use strict";

    var oMockServer,
        _sAppPath = "sap/fiori/freestyle/",
        _sJsonFilesPath = _sAppPath + "localService/mockdata";

    var oMockServerInterface = {

        /**
         * Initializes the mock server asynchronously.
         * You can configure the delay with the URL parameter "serverDelay".
         * The local mock data in this folder is returned instead of the real data for testing.
         * @protected
         * @param {object} [oOptionsParameter] init parameters for the mockserver
         * @returns{Promise} a promise that is resolved when the mock server has been started
         */
        init: function (oOptionsParameter) {
            var oOptions = oOptionsParameter || {};

            return new Promise(function (resolve, reject) {
                var sManifestUrl = sap.ui.require.toUrl(_sAppPath + "manifest.json"),
                    oManifestModel = new JSONModel(sManifestUrl);

                oManifestModel.attachRequestCompleted(function () {
                    var oUriParameters = new UriParameters(window.location.href),
                        // parse manifest for local metadata URI
                        sJsonFilesUrl = sap.ui.require.toUrl(_sJsonFilesPath),
                        oMainDataSource = oManifestModel.getProperty("/sap.app/dataSources/mainService"),
                        sMetadataUrl = sap.ui.require.toUrl(_sAppPath + oMainDataSource.settings.localUri),
                        // ensure there is a trailing slash
                        sMockServerUrl = /.*\/$/.test(oMainDataSource.uri) ? oMainDataSource.uri : oMainDataSource.uri + "/";

                    // create
                    oMockServer = new MockServer({
                        rootUri: sMockServerUrl
                    });

                    // configure
                    MockServer.config({
                        autoRespond: true,
                        autoRespondAfter: oOptions.delay || oUriParameters.get("serverDelay") || 500
                    });

                    // simulate all requests using mock data
                    oMockServer.simulate(sMetadataUrl, {
                        sMockdataBaseUrl: sJsonFilesUrl,
                        bGenerateMissingMockData: true
                    });

                    var aRequests = oMockServer.getRequests();

                    // compose an error response for requesti
                    var fnResponse = function (iErrCode, sMessage, aRequest) {
                        aRequest.response = function (oXhr) {
                            oXhr.respond(iErrCode, {
                                "Content-Type": "text/plain;charset=utf-8"
                            }, sMessage);
                        };
                    };

                    oMockServer.setRequests(aRequests);
                    oMockServer.start();

                    Log.info("Running the app with mock data");
                    resolve();
                });

                oManifestModel.attachRequestFailed(function () {
                    var sError = "Failed to load application manifest";

                    Log.error(sError);
                    reject(new Error(sError));
                });
            });
        }
    };

    return oMockServerInterface;
});
