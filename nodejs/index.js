/*!
 *  Bayrell Runtime Library
 *
 *  (c) Copyright 2016-2018 "Ildar Bikmamatov" <support@bayrell.org>
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      https://www.bayrell.org/licenses/APACHE-LICENSE-2.0.html
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

const use = require("bay-lang").use;
const rtl = use("Runtime.rtl");

exports.VERSION = "1.0";
exports.MODULE_NAME = "Runtime.Web";
const add = rtl.add(__dirname, exports);

add("Runtime.Web.Annotations.Api");
add("Runtime.Web.Annotations.ApiMethod");
add("Runtime.Web.Annotations.Route");
add("Runtime.Web.Hooks.ApiPrefix");
add("Runtime.Web.Hooks.AppHook");
add("Runtime.Web.Hooks.AssetsHook");
add("Runtime.Web.Hooks.CanonicalUrl");
add("Runtime.Web.Hooks.Components");
add("Runtime.Web.Hooks.DetectLanguage");
add("Runtime.Web.Hooks.DetectTheme");
add("Runtime.Web.Hooks.Environments");
add("Runtime.Web.Hooks.Middleware");
add("Runtime.Web.Hooks.PageNotFound");
add("Runtime.Web.Hooks.ResponseHook");
add("Runtime.Web.Hooks.SetupLayout");
add("Runtime.Web.Hooks.WidgetModelFactory");
add("Runtime.Web.Assets");
add("Runtime.Web.ApiRequest");
add("Runtime.Web.ApiResult");
add("Runtime.Web.ApiRoute");
add("Runtime.Web.BaseApi");
add("Runtime.Web.BaseRoute");
add("Runtime.Web.BusLocal");
add("Runtime.Web.Cookie");
add("Runtime.Web.EmailLayout");
add("Runtime.Web.Express");
add("Runtime.Web.Fastify");
add("Runtime.Web.Headers");
add("Runtime.Web.Response");
add("Runtime.Web.JsonResponse");
add("Runtime.Web.Middleware");
add("Runtime.Web.RedirectResponse");
add("Runtime.Web.RenderContainer");
add("Runtime.Web.Request");
add("Runtime.Web.RouteInfo");
add("Runtime.Web.RouteAction");
add("Runtime.Web.RouteList");
add("Runtime.Web.RouteModel");
add("Runtime.Web.RoutePage");
add("Runtime.Web.RouteProvider");
add("Runtime.Web.Translator");
add("Runtime.Web.ModuleDescription");

module.exports = exports;