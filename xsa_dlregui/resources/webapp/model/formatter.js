sap.ui.define([], function () {
	"use strict";
	return {
		dateText: function (sDate) {
			//var resourceBundle = this.getView().getModel("i18n").getResourceBundle();
			var date = new Date(sDate);
			return date.toLocaleDateString('en-GB');
		},
		statusText: function (sStatus) {
			var oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
			switch (sStatus) {
			case "A":
				return oResourceBundle.getText("eventStatusA");
			case "B":
				return oResourceBundle.getText("eventStatusB");
			case "C":
				return oResourceBundle.getText("eventStatusC");
			case "D":
				return oResourceBundle.getText("eventStatusD");
			case "E":
				return oResourceBundle.getText("eventStatusE");
			case "F":
				return oResourceBundle.getText("eventStatusF");
			default:
				return sStatus;
		}
		}
	};
});