sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"xsa_dataloaderui/model/models",
	"sap/ui/model/resource/ResourceModel"
], function(UIComponent, Device, models, ResourceModel) {
	"use strict";

	return UIComponent.extend("xsa_dataloaderui.Component", { 

		metadata: {
			manifest: "json"
		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * @public
		 * @override
		 */
		init: function() {
			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);

			// set i18n model
			var i18nModel = new ResourceModel({
				bundleName: "xsa_dataloaderui.i18n.i18n"
			});
			this.setModel(i18nModel, "i18n");
			// set the device model
			this.setModel(models.createDeviceModel(), "device");
			// create the views based on the url/hash
			this.getRouter().initialize();

		}
	});
});