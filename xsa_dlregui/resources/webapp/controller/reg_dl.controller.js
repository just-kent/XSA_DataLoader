sap.ui.define([
		'sap/ui/core/mvc/Controller',
		"xsa_dlregui/model/formatter",
		"sap/ui/model/Filter",
		"sap/ui/model/FilterOperator",
		"sap/ui/ux3/OverlayContainer"
	], function(Controller, formatter, Filter, FilterOperator) {
	"use strict";
	var overlayCon;
	var oSchemaTabModel = new sap.ui.model.json.JSONModel();
	var oSchemaNTabModel = new sap.ui.model.json.JSONModel();
	var oProcTabModel = new sap.ui.model.json.JSONModel();
	var oProcNTabModel = new sap.ui.model.json.JSONModel();
	var otabSchemaVHD;
	var otabSchemaTabVHD;
	var oProcSchemaVHD;
	var oProcSchemaTabVHD;
	var ocolTabModel;
	return Controller.extend("xsa_dlregui.controller.reg_dl", {
		formatter: formatter,
		onInit: function(oEvent) {
			//1. Initialize Model
			var oRegModel = new sap.ui.model.odata.v2.ODataModel("./model/dl_reg.xsodata");
			this.getView().setModel(oRegModel, "dl_reg");
			// User defined column table
			ocolTabModel = new sap.ui.model.odata.v2.ODataModel("./model/coltable.xsodata");
			this.getView().setModel(ocolTabModel, "coltable");
			// Input Help data for hdbtable schema
			oSchemaTabModel.loadData("./model/dl_reg.xsjs?cmd=get_schemalist&objtype=hdbtable");
			// Input Help data for hdbtable name
			oSchemaNTabModel.loadData("./model/dl_reg.xsjs?cmd=get_tablelist");
			// Input Help data for hdbprocedure schema
			oProcTabModel.loadData("./model/dl_reg.xsjs?cmd=get_schemalist&objtype=hdbprocedure");
			// Input Help data for hprocedureschema
			oProcNTabModel.loadData("./model/dl_reg.xsjs?cmd=get_proclist");
			// Set username detail into JSON model
			var oUserModel = new sap.ui.model.json.JSONModel();
			oUserModel.loadData("./model/misc.xsjs?cmd=get_username");
			this.getView().setModel(oUserModel);

			this.inputchk = {};
			this.inputchk.i_proj = "";
			this.inputchk.i_schema = "";
			this.inputchk.i_table = "";
			this.inputchk.i_header = "";
			this.inputchk.i_rows = "";
			this.inputchk.i_procschema = "";
			this.inputchk.i_procname = "";
			this.inputchk.i_xsjsname = "";
			this.inputchk.autoproc = "";
			this.maxvalidate = 0;
		},
		onFilterDLREG: function(oEvent) {
			// 1. Build Filter array
			var aFilter = [];
			var sQuery = oEvent.getParameter("query"); // sQuery contain value for user input
			if (sQuery) {
				aFilter.push(new Filter("toupper(PROJ)", FilterOperator.Contains, "'" + sQuery.toUpperCase() + "'"));
			}
			// filter binding
			var oList = this.getView().byId("reg_dlList");
			var oBinding = oList.getBinding("items");
			oBinding.filter(aFilter);
		},
		onTablePress: function(evt) {
			// Triggered when user click on the Navigation Table row
			var oItem = evt.getSource();
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this); // <-- originally it will return value "/Invoice/3"
			var str = oItem.getBindingContext("dl_reg").getPath(); // <-- However invoicePath do not accept char "/"
			var n = str.lastIndexOf("/") + 1; // <-- in order to solve this, use javascript function to remove all string prior to last char "/"
			// Navigate to defined detail Router's path according to user selected index. (Configured in .manifest file)
			oRouter.navTo("detail", {
				dlregPath: str.slice(n) // <-- value of str will now become "0", "1", "2", etc...
			});
		},
		overlayclosehandler: function(oEvent) {
			//Event triggered when closing the Overlay Container
			this.destroyContent();
		},
		onOverlayOpen: function(oEvent){
		    
		},
		handleCreatePress: function() {
			// Event triggered when user click 'Register' button
			//1. Initialize the Overlay component
			var oFormFragment = sap.ui.xmlfragment(this.getView().getId(), "xsa_dlregui.view.RegForm", this.getView().getController());
			var oOverlayContainer = new sap.ui.ux3.OverlayContainer();
			oOverlayContainer.attachClose(this.overlayclosehandler);
			oOverlayContainer.attachClosed(this.overlayclosehandler);
			oOverlayContainer.attachOpen(this.onOverlayOpen);
			oOverlayContainer.addContent(oFormFragment);

			//2. Register the OData to Overlay Container
			var oRegModel = new sap.ui.model.odata.v2.ODataModel("./model/dl_reg.xsodata");
			oOverlayContainer.setModel(oRegModel, "dl_reg");
			oOverlayContainer.open();
			// [To be removed!!!] Set container to global object
			debugger;
			overlayCon = oOverlayContainer;

			//3. Initialize Wizard controls
			this._initWizard(this);

			//4. Initialize Input Help controls
			this._initHdrMultiInp(this);

			//5. Initialize ValueHelpDialog controller
			//5.1. Schema only table
			this._initValueHelp(
				"otabSchemaVHD",
				this,
				"SCHEMA_NAME",
				"Schema Name",
				"i_schema", [{
					label: "Schema Name",
					template: "SCHEMA_NAME"
				}],
				oSchemaTabModel);

			//5.2. Schema & Table
			this._initValueHelp(
				"otabSchemaTabVHD",
				this,
				"TABLE_NAME",
				"TABLE Name",
				"i_table", [{
					label: "Schema Name",
					template: "SCHEMA_NAME"
				}, {
					label: "Table Name",
					template: "TABLE_NAME"
				}],
				oSchemaNTabModel);

			//5.3. Procedure table
			this._initValueHelp(
				"oProcSchemaVHD",
				this,
				"SCHEMA_NAME",
				"Schema Name",
				"i_procschema", [{
					label: "Schema Name",
					template: "SCHEMA_NAME"
				}],
				oProcTabModel);

			//5.4. Procedure & Schema
			this._initValueHelp(
				"oProcSchemaTabVHD",
				this,
				"TABLE_NAME",
				"Schema Name",
				"i_procname", [{
					label: "Schema Name",
					template: "SCHEMA_NAME"
				}, {
					label: "Procedure Name",
					template: "TABLE_NAME"
				}],
				oProcNTabModel);
		},
		handleWizardSubmit: function() {
			// Event triggered when user click Submit button
			this._getProjID(this);
		},
		_getProjID: function(self) {
			// Get the next available Project ID to be created
			var url = './model/dl_reg.xsjs?cmd=get_id_next';
			jQuery.ajax({
				url: url,
				method: 'GET',
				dataType: 'json',
				success: function(data) {
					// Trigger function to create the Project Register
					self._createProjEntry(data.toString(), self);
				}
			});
		},
		_createProc: function(tableschema, tablename, procschema, procname) {
			// Calling function to trigger xsjs service to auto generate stored procedure in HANA
			var url = './model/dl_reg.xsjs?cmd=create_proc&schema=' + tableschema + '&table=' + tablename + '&procschema=' + procschema +
				'&procname=' + procname;
			jQuery.ajax({
				url: url,
				method: 'GET',
				dataType: 'json',
				error: function(data) {
				    self._updateHdr(self.getView().byId("i_header").getTokens(),oEntry.ID);
				    var bCompact = !!self.getView().$().closest(".sapUiSizeCompact").length;
				    sap.m.MessageBox.error(
        				"Failed to create procedure!",
        				{
        					styleClass: bCompact? "sapUiSizeCompact" : ""
        				}
        			);
					//sap.m.MessageToast.show("Alert! Failed to create procedure");
				}
			});
		},
		_createHdrEntry: function(myTokens, myid) {
			// OData Batch Create function to write back newly register user defined column name
			var oTabModel = new sap.ui.model.odata.v2.ODataModel("./model/coltable.xsodata");
			this.getView().setModel(oTabModel, "coltable");
            var self = this;
			for (var i = 0; i < myTokens.length; i++) {
				oTabModel.createEntry("coltable", {
					properties: {
						PROJID: myid,
						SEQ: i + 1 + "",
						COLUMN_NAME: myTokens[i].getText()
					}
				});
			}

			oTabModel.submitChanges({
				success: function(data) {
					if (data.__batchResponses[0].response) {
					    var bCompact = !!self.getView().$().closest(".sapUiSizeCompact").length;
    				    sap.m.MessageBox.error(
            				"Error while registering header information!",
            				{
            					styleClass: bCompact? "sapUiSizeCompact" : ""
            				}
            			);
						//sap.m.MessageToast.show("Error while registering header");
					} else {
					    var bCompact = !!self.getView().$().closest(".sapUiSizeCompact").length;
    				    sap.m.MessageBox.success(
            				"Successfully register new project.",
            				{
            					styleClass: bCompact? "sapUiSizeCompact" : ""
            				}
            			);
						//sap.m.MessageToast.show("Successfull Register Project");
					}
				},
				error: function(e) {
				    var bCompact = !!self.getView().$().closest(".sapUiSizeCompact").length;
				    sap.m.MessageBox.error(
        				"Error while registering header information!",
        				{
        					styleClass: bCompact? "sapUiSizeCompact" : ""
        				}
        			);
					//sap.m.MessageToast.show("Error while registering header");
				}
			});
		},
		_createProjEntry: function(id, self) {
			//1. Initialize variables
			var oEntry = {};
			oEntry.ID = id;
			oEntry.PROJ = self.getView().byId("i_proj").getValue();
			oEntry.USER = self.getView().byId("h_appheader").getUserName();
			oEntry.DATE = new Date(self.getDate());
			oEntry.SCHEMA = self.getView().byId("i_schema").getValue();
			oEntry.TABLE = self.getView().byId("i_table").getValue();
			oEntry.HEADER = self.getView().byId("i_header").getValue();
			oEntry.ROWS = self.getView().byId("i_rows").getValue();
			oEntry.PROCSCHEMA = self.getView().byId("i_procschema").getValue();
			oEntry.PROCNAME = self.getView().byId("i_procname").getValue();
			// Special handling to default XSJS to dl_upload.xsjs unless specified
			oEntry.XSJSNAME = self.getView().byId("i_xsjsname").getValue();
			if(self.getView().byId("cb_df_xsjs").getSelected() == false) {
				oEntry.XSJSNAME = "dl_upload";
			}
			
			var updatepath = "/dl_reg";

			// OData function to create inividual request containing respective dataset
			this.getView().getModel("dl_reg").create(updatepath, oEntry, {
				success: function(data) {
					if (self.getView().byId("rbg_proc").getSelectedIndex() == 1) {
						self._createProc(oEntry.SCHEMA, oEntry.TABLE, oEntry.PROCSCHEMA, oEntry.PROCNAME);
					}
					// Once the main project entry successfully stored in hdbtable, insert all the user defined column name information into coltable as well
					self._createHdrEntry(self.getView().byId("i_header").getTokens(), oEntry.ID);
					// Close the Overlay Dialog box
					overlayCon.close();
				}, //need to show alert message and force update on Odata Model to reflect changes across controls
				error: function(e) {
					overlayCon.close();
					var bCompact = !!self.getView().$().closest(".sapUiSizeCompact").length;
				    sap.m.MessageBox.error(
        				"Failed to register new project",
        				{
        					styleClass: bCompact? "sapUiSizeCompact" : ""
        				}
        			);
					//sap.m.MessageToast.show("Alert! Failed to register");
				}
			});
		},
		_ChckInput: function(that) {
			// Function triggered whenever user edit the input field within Overlay Container dialog box
			// Check the input in order to trigger the next step in Wizard controls
			var errFld = "";
			if (that.getView().byId("i_schema").getValue() === "") {
				errFld = "Table's Schema";
				that.getView().byId("i_schema").setValueState(sap.ui.core.ValueState.Error);
			} else {
				that.getView().byId("i_schema").setValueState(sap.ui.core.ValueState.Success);
			}
			if (that.getView().byId("i_proj").getValue() === "") {
				errFld = "Project Identifier";
				that.getView().byId("i_proj").setValueState(sap.ui.core.ValueState.Error);
			} else {
				that.getView().byId("i_proj").setValueState(sap.ui.core.ValueState.Success);
			}
			if (that.getView().byId("i_table").getValue() === "") {
				errFld = "Table Name";
				that.getView().byId("i_table").setValueState(sap.ui.core.ValueState.Error);
			} else {
				that.getView().byId("i_table").setValueState(sap.ui.core.ValueState.Success);
			}
			if (that.getView().byId("i_header").getValue() === "") {
				errFld = "Template Header";
				that.getView().byId("i_header").setValueState(sap.ui.core.ValueState.Error);
			} else {
				that.getView().byId("i_header").setValueState(sap.ui.core.ValueState.Success);
			}
			if (that.getView().byId("i_rows").getValue() === "") {
				errFld = "Rows ignore";
				that.getView().byId("i_rows").setValueState(sap.ui.core.ValueState.Error);
			} else {
				that.getView().byId("i_rows").setValueState(sap.ui.core.ValueState.Success);
			}
			if (that.getView().byId("i_xsjsname").getValue() === "") {
				errFld = "XSJS Name";
				that.getView().byId("i_xsjsname").setValueState(sap.ui.core.ValueState.Error);
			} else {
				that.getView().byId("i_xsjsname").setValueState(sap.ui.core.ValueState.Success);
			}
			if (that.getView().byId("rbg_proc").getSelectedIndex() == 1) {
				if (that.getView().byId("i_procschema").getValue() === "") {
					errFld = "Procedure's Schema";
					that.getView().byId("i_procschema").setValueState(sap.ui.core.ValueState.Error);
				} else {
					that.getView().byId("i_procschema").setValueState(sap.ui.core.ValueState.Success);
				}
				if (that.getView().byId("i_procname").getValue() === "") {
					errFld = "Procedure Name";
					that.getView().byId("i_procname").setValueState(sap.ui.core.ValueState.Error);
				} else {
					that.getView().byId("i_procname").setValueState(sap.ui.core.ValueState.Success);
				}
			}

			if (errFld != "") {
				var dialog = new sap.m.Dialog({
					title: 'Error',
					type: 'Message',
					state: 'Error',
					content: new sap.m.Text({
						text: 'Field ' + errFld + ' empty!'
					}),
					beginButton: new sap.m.Button({
						text: 'OK',
						press: function() {
							dialog.close();
						}
					}),
					afterClose: function() {
						dialog.destroy();
					}
				});

				dialog.open();
			}
			return errFld;
		},
		getDate: function get_date() {
			var today = new Date();
			var sday = today.getDate().toString();
			var smonth = today.getMonth() + 1;
			smonth = smonth.toString();

			if (smonth.length < 2) {
				smonth = '0' + smonth;
			}
			if (sday.length < 2) {
				sday = '0' + sday;
			}
			var sdate = today.getFullYear().toString() + "-" + smonth + "-" + sday;

			return sdate;
		},
		handleSuggest: function(oEvent) {
			var sTerm = oEvent.getParameter("suggestValue");
			var aFilters = [];
			if (sTerm) {
				aFilters.push(new Filter("SCHEMA", sap.ui.model.FilterOperator.StartsWith, sTerm));
			}
			oEvent.getSource().getBinding("suggestionItems").filter(aFilters);
		},
		attachReqComplete: function(self) {
			// Attach event listener for Batch Request
			this.getView().getModel("dl_reg").attachBatchRequestCompleted(function() {
				// Force oData model from previous View to refresh itself
				var oPreView = sap.ui.getCore().getElementById("__component0---v_reg_dlOverview");
				oPreView.getModel("dl_reg").refresh(true);
			});
		},
		_initValueHelp: function(valDialog, that, keyFld, keyName, inputCtrl, colArray, jsonmodel) {
			// Initiaze Value Help dialog box
			var oValueHelpDialog = new sap.ui.comp.valuehelpdialog.ValueHelpDialog({
				basicSearchText: that.getView().byId(inputCtrl).getValue(),
				title: keyName + " Search",
				supportMultiselect: false,
				supportRanges: false,
				supportRangesOnly: false,
				key: keyFld,
				descriptionKey: keyName,
				stretch: sap.ui.Device.system.phone,

				ok: function(oControlEvent) {
					// Set the Input control with user selected value from Input Help Dialog box
					that.getView().byId(inputCtrl).setValue(oControlEvent.getParameter("tokens")[0].mAggregations.customData[0].getValue()[keyFld]);
					// Set the value to be passed into Input Validation function
					var param = {};
					param.id = "__component0---v_reg_dlOverview--" + inputCtrl;
					param.value = oControlEvent.getParameter("tokens")[0].mAggregations.customData[0].getValue()[keyFld];
					that.getView().byId(inputCtrl).fireLiveChange(param);
					// Reset the Value Help Dialog
					oControlEvent.reset();
					// Close the dialog box
					oValueHelpDialog.close();
					// Clear the selected option. (Else will caused the next search to go crazy!)
					this.getTable().setSelectedIndex(-1);
				},

				cancel: function(oControlEvent) {
					oValueHelpDialog.close();
				},

				afterClose: function() {
					// After Input Help dialog box closed, reset the table data
					oValueHelpDialog.getTable().getBinding("rows").aFilters = null;
					oValueHelpDialog.getTable().getModel().refresh(true);
				}
			});

			//2. Define the Input Help dialog table's name based on hdbtable entries
			for (var i = 0; i < colArray.length; i++) {
				oValueHelpDialog.getTable().addColumn(new sap.ui.table.Column({
					label: new sap.ui.commons.Label({
						text: colArray[i].label
					}),
					template: new sap.ui.commons.TextView().bindText(colArray[i].template)

				}));
			}
			//3. Bind the model to Input Help dialog's internal table
			oValueHelpDialog.getTable().setModel(jsonmodel).bindRows("/OUTPUT_TABLE");

			//4. Set the filtering function to basic. (Can set to advance mode if needed)
			var oFilterBar = new sap.ui.comp.filterbar.FilterBar({
				advancedMode: false,
				filterBarExpanded: false,
				showGoButton: false
			});

			//5. Define the filter setting
			if (oFilterBar.setBasicSearch) {
				oFilterBar.setBasicSearch(new sap.m.SearchField({
					showSearchButton: sap.ui.Device.system.phone,
					placeholder: "Search",
					search: function(oEvent) {
						// When filter activated, set the filter function into the Model and refresh it in order to achieve filter function
						var aFilter = [];
						var sQuery = oEvent.getParameter("query"); // sQuery contain value for user input
						var oBinding = oValueHelpDialog.getTable().getBinding("rows");
						if (sQuery) {
							aFilter.push(new Filter(keyFld, FilterOperator.Contains, sQuery.toUpperCase()));
							// filter binding
							oBinding.filter(aFilter);
						} else {
							oBinding.aFilters = null;
							oValueHelpDialog.getTable().getModel().refresh(true);
						}
					}
				}));
			}
			// Set the filter function
			oValueHelpDialog.setFilterBar(oFilterBar);

			// Dynamically set the display layour based on user device screen size
			if (that.getView().byId(inputCtrl).$().closest(".sapUiSizeCompact").length > 0) { // check if the Token field runs in Compact mode
				oValueHelpDialog.addStyleClass("sapUiSizeCompact");
			} else {
				oValueHelpDialog.addStyleClass("sapUiSizeCozy");
			}
			// Assign back the initialized valuehelpdialog back to global object
			switch (valDialog) {
				case "otabSchemaVHD":
					otabSchemaVHD = oValueHelpDialog;
					break;

				case "otabSchemaTabVHD":
					otabSchemaTabVHD = oValueHelpDialog;
					break;

				case "oProcSchemaVHD":
					oProcSchemaVHD = oValueHelpDialog;
					break;

				case "oProcSchemaTabVHD":
					oProcSchemaTabVHD = oValueHelpDialog;
					break;

			}
		},
		onValueHelpRequest: function(event) {
			switch (event.getParameter("id")) {
				case "__component0---v_reg_dlOverview--i_schema":
					otabSchemaVHD.open();
					break;
				case "__component0---v_reg_dlOverview--i_table":
					otabSchemaTabVHD.open();
					break;
				case "__component0---v_reg_dlOverview--i_procschema":
					oProcSchemaVHD.open();
					break;
				case "__component0---v_reg_dlOverview--i_procname":
					oProcSchemaTabVHD.open();
					break;
			}
		},
		// 		_createColTabDialog: function() {
		// 			//Create an instance of the table control
		// 			var oTable = new sap.m.Table({
		// 				title: "Template Columns",
		// 				visibleRowCount: 50,
		// 				showOverlay: true,
		// 				firstVisibleRow: 1
		// 			});
		// 			//Define the columns and the control templates to be used
		// 			var oColumn = new sap.m.Column({
		// 				label: new sap.ui.commons.Label({
		// 					text: "Columns Name"
		// 				}),
		// 				template: new sap.ui.commons.TextField(),
		// 				width: "200px"
		// 			});
		// 			oTable.addColumn(oColumn);
		// 			return oTable;

		// 		},
		_initHdrMultiInp: function(that) {
			var oMultiInput1 = that.getView().byId("i_header");
			//*** add checkbox validator
			oMultiInput1.addValidator(function(args) {
				var text = args.text;
				return new sap.m.Token({
					key: text,
					text: text
				});
			});
		},
		_initWizard: function(that) {
			//1. Initialize the Wizard controls
			that._wizard = that.getView().byId("RegisterDLWizard");
			that._oNavContainer = that.getView().byId("wizardNavContainer");
			that._oWizardContentPage = that.getView().byId("wizardContentPage");
			that._oWizardReviewPage = sap.ui.xmlfragment(that.getView().getId(), "xsa_dlregui.view.RegReview", that.getView()
				.getController());
			that._oNavContainer.addPage(that._oWizardReviewPage);
			that.model = new sap.ui.model.json.JSONModel();
			that.inputModel = new sap.ui.model.json.JSONModel();

			that.model.setData({
				projIdentState: "Error",
				tableSchemaState: "Error",
				tableNameState: "Error",
				templateHdrState: "Error",
				templateRowsState: "Error",
				procedureSchemaState: "Error",
				procedureNameState: "Error",
				xsjsNameState: "Error"
			});
			that.inputModel.setData({
				proj: "",
				schema: "",
				tableN: "",
				header: "",
				rvheader: "",
				rows: "",
				procschema: "",
				procname: "",
				xsjsname: ""
			});
			sap.ui.getCore().setModel(that.model, "inputState");
			sap.ui.getCore().setModel(that.inputModel, "valInput");
			that._wizard.validateStep(that.getView().byId("XSJSInfoStep"));
			that.maxvalidate = 4;
		},
		projValidation: function(oEvent) {
		    
			// Validation function for Step 1 in Wizard screen
			var inputid = oEvent.getParameter("id").split("--")[2];
			var inputval = oEvent.getParameter("value");

			if (inputval) {
				this.inputchk[inputid] = "X";
				switch (inputid) {
					case "i_proj":
						sap.ui.getCore().getModel("inputState").setProperty("/projIdentState", "None");
						break;
					case "i_schema":
						sap.ui.getCore().getModel("inputState").setProperty("/tableSchemaState", "None");
						break;
					case "i_table":
						sap.ui.getCore().getModel("inputState").setProperty("/tableNameState", "None");
						break;
				}
			} else {
				this.inputchk[inputid] = "";
				switch (inputid) {
					case "i_proj":
						sap.ui.getCore().getModel("inputState").setProperty("/projIdentState", "Error");
						break;
					case "i_schema":
						sap.ui.getCore().getModel("inputState").setProperty("/tableSchemaState", "Error");
						break;
					case "i_table":
						sap.ui.getCore().getModel("inputState").setProperty("/tableNameState", "Error");
						break;
				}
			}

			if ((this.inputchk.i_proj == "X") && (this.inputchk.i_schema == "X") && (this.inputchk.i_table == "X")) {
				this._wizard.validateStep(this.getView().byId("ProjIdentStep"));
				if (this.maxvalidate > 1) {
					switch (this.maxvalidate) {
						case 2:
							this._wizard.validateStep(this.getView().byId("TemplateInfoStep"));
							break;
						case 3:
							this._wizard.validateStep(this.getView().byId("ProcedureInfoStep"));
							break;
						case 4:
							this._wizard.validateStep(this.getView().byId("XSJSInfoStep"));
							break;
					}
				} else {
					this.maxvalidate = 1;
				}
			} else {
				this._wizard.invalidateStep(this.getView().byId("ProjIdentStep"));
				this._wizard.invalidateStep(this.getView().byId("TemplateInfoStep"));
				this._wizard.invalidateStep(this.getView().byId("ProcedureInfoStep"));
				this._wizard.invalidateStep(this.getView().byId("XSJSInfoStep"));
			}
		},
		templateValidation: function(oEvent) {
			// Validation function for Step 2 in Wizard screen
			var inputid = oEvent.getParameter("id").split("--")[2];
			var inputval = oEvent.getParameter("value");

			if (inputval) {
				this.inputchk[inputid] = "X";
				sap.ui.getCore().getModel("inputState").setProperty("/templateRowsState", "None");
			} else {
				this.inputchk[inputid] = "";
				sap.ui.getCore().getModel("inputState").setProperty("/templateRowsState", "Error");
			}

			if ((this.inputchk.i_header == "X") && (this.inputchk.i_rows == "X")) {
				this._wizard.validateStep(this.getView().byId("TemplateInfoStep"));
				if (this.maxvalidate > 2) {
					switch (this.maxvalidate) {
						case 3:
							this._wizard.validateStep(this.getView().byId("ProcedureInfoStep"));
							break;
						case 4:
							this._wizard.validateStep(this.getView().byId("XSJSInfoStep"));
							break;
					}
				} else {
					this.maxvalidate = 2;
				}
			} else {
				this._wizard.invalidateStep(this.getView().byId("TemplateInfoStep"));
				this._wizard.invalidateStep(this.getView().byId("ProcedureInfoStep"));
				this._wizard.invalidateStep(this.getView().byId("XSJSInfoStep"));
			}
		},
		procValidation: function(oEvent) {
			// Validation function for Step 3 in Wizard screen
			var inputid = oEvent.getParameter("id").split("--")[2];
			var inputval = oEvent.getParameter("value");

			if (inputval) {
				this.inputchk[inputid] = "X";
				switch (inputid) {
					case "i_procschema":
						sap.ui.getCore().getModel("inputState").setProperty("/procedureSchemaState", "None");
						break;
					case "i_procname":
						sap.ui.getCore().getModel("inputState").setProperty("/procedureNameState", "None");
						break;
				}
			} else {
				this.inputchk[inputid] = "";
				switch (inputid) {
					case "i_procschema":
						sap.ui.getCore().getModel("inputState").setProperty("/procedureSchemaState", "Error");
						break;
					case "i_procname":
						sap.ui.getCore().getModel("inputState").setProperty("/procedureNameState", "Error");
						break;
				}
			}

			if ((this.inputchk.i_procschema == "X") && (this.inputchk.i_procname == "X")) {
				this._wizard.validateStep(this.getView().byId("ProcedureInfoStep"));
				if (this.maxvalidate > 3) {
					this._wizard.validateStep(this.getView().byId("XSJSInfoStep"));
				} else {
					this.maxvalidate = 3;
				}
			} else {
				if (this.getView().byId("rbg_proc").getSelectedIndex() == 0) {
					this._wizard.invalidateStep(this.getView().byId("ProcedureInfoStep"));
					this._wizard.invalidateStep(this.getView().byId("XSJSInfoStep"));
				}

			}
		},
		xsjsValidation: function(oEvent) {
			// Validation function for Step 4 in Wizard screen
			var inputid = oEvent.getParameter("id").split("--")[2];
			var inputval = oEvent.getParameter("value");
			debugger;
			if (inputval) {
				this.inputchk[inputid] = "X";
				sap.ui.getCore().getModel("inputState").setProperty("/xsjsNameState", "None");
			} else {
				if(self.getView().byId("cb_df_xsjs").getSelected() == true) {
					this.inputchk[inputid] = "X";
					sap.ui.getCore().getModel("inputState").setProperty("/xsjsNameState", "None");
				} else {
					this.inputchk[inputid] = "";
					sap.ui.getCore().getModel("inputState").setProperty("/xsjsNameState", "Error");
				}
				
			}

			if (this.inputchk.i_xsjsname == "X") {
				this._wizard.validateStep(this.getView().byId("XSJSInfoStep"));
				this.maxvalidate = 4;
			} else if (self.getView().byId("cb_df_xsjs").getSelected() == true) {    
				this._wizard.validateStep(this.getView().byId("XSJSInfoStep"));
				this.maxvalidate = 4;
			} else {
				this._wizard.invalidateStep(this.getView().byId("XSJSInfoStep"));
			}

		},
		onRGBSelect: function() {
			// Validation function for Step 3 in Wizard screen
			if (this.getView().byId("rbg_proc").getSelectedIndex() != 0) {
				this._wizard.validateStep(this.getView().byId("ProcedureInfoStep"));
				this.inputchk.autoproc = "X";
				if (this.maxvalidate > 3) {
					this._wizard.validateStep(this.getView().byId("XSJSInfoStep"));
				} else {
					this.maxvalidate = 3;
				}
			} else {
				this.inputchk.autoproc = "";
				if ((this.inputchk.i_procschema == "X") && (this.inputchk.i_procname == "X")) {
					this._wizard.validateStep(this.getView().byId("ProcedureInfoStep"));
					if (this.maxvalidate > 3) {
						this._wizard.validateStep(this.getView().byId("XSJSInfoStep"));
					} else {
						this.maxvalidate = 3;
					}
				} else {
					this._wizard.invalidateStep(this.getView().byId("ProcedureInfoStep"));
					this._wizard.invalidateStep(this.getView().byId("XSJSInfoStep"));
				}
			}

		},
		tokenValidation: function(oEvent) {
			// Validation function for Step 2 in Wizard screen
			var tokens = this.getView().byId("i_header").getTokens();
			if (tokens.length > 0) {
				this.inputchk.i_header = "X";
				sap.ui.getCore().getModel("inputState").setProperty("/templateHdrState", "None");
			} else {
				this.inputchk.i_header = "";
				sap.ui.getCore().getModel("inputState").setProperty("/templateHdrState", "Error");
			}
			if ((this.inputchk.i_header == "X") && (this.inputchk.i_rows == "X")) {
				this._wizard.validateStep(this.getView().byId("TemplateInfoStep"));
				if (this.maxvalidate > 2) {
					switch (this.maxvalidate) {
						case 3:
							this._wizard.validateStep(this.getView().byId("ProcedureInfoStep"));
							break;
						case 4:
							this._wizard.validateStep(this.getView().byId("XSJSInfoStep"));
							break;
					}
				} else {
					this.maxvalidate = 2;
				}
			} else {
				this._wizard.invalidateStep(this.getView().byId("TemplateInfoStep"));
				this._wizard.invalidateStep(this.getView().byId("ProcedureInfoStep"));
				this._wizard.invalidateStep(this.getView().byId("XSJSInfoStep"));
			}
		},
		wizardCompletedHandler: function() {
			// Triggered once user click 'Review' button
			var tokens = this.getView().byId("i_header").getTokens();
			var headertxt = "";
			for (var i = 0; i < tokens.length; i++) {
				headertxt = headertxt + tokens[i].getText() + " , ";
			}
			headertxt = headertxt.substr(0, headertxt.length - 3);
			sap.ui.getCore().getModel("valInput").setProperty("/rvheader", headertxt);

			// Navigate to Review page
			this._oNavContainer.to(this._oWizardReviewPage);

		},
		editStepOne: function() {
			this._handleNavigationToStep(0);
		},
		editStepTwo: function() {
			this._handleNavigationToStep(1);
		},
		editStepThree: function() {
			this._handleNavigationToStep(2);
		},
		editStepFour: function() {
			this._handleNavigationToStep(3);
		},
		_handleNavigationToStep: function(iStepNumber) {
			var that = this;

			function fnAfterNavigate() {
				that._wizard.goToStep(that._wizard.getSteps()[iStepNumber]);
				that._oNavContainer.detachAfterNavigate(fnAfterNavigate);
			}

			this._oNavContainer.attachAfterNavigate(fnAfterNavigate);
			this.backToWizardContent();
		},
		backToWizardContent: function() {
			this._oNavContainer.backToPage(this._oWizardContentPage.getId());
		},
		handleWizardCancel: function() {
			overlayCon.close();
		}

	});
});