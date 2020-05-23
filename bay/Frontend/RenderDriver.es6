"use strict;"
/*!
 *  Bayrell Core Library
 *
 *  (c) Copyright 2018-2019 "Ildar Bikmamatov" <support@bayrell.org>
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

if (typeof Runtime == 'undefined') Runtime = {};
if (typeof Runtime.Web == 'undefined') Runtime.Web = {};
if (typeof Runtime.Web.Frontend == 'undefined') Runtime.Web.Frontend = {};
var use = (typeof Runtime != 'undefined' && typeof Runtime.rtl != 'undefined') ? Runtime.rtl.find_class : null;


/**
 * Change model detector
 */
Runtime.CoreStruct.prototype.initData = function (old_model, changed)
{
	if (changed == undefined) changed=null;
	
	/*
	if (old_model != null)
	{
		console.log(old_model);
		console.log(changed);
	}
	*/
}


/**
 * Control object
 */
Runtime.Web.Frontend.Control = function()
{
	this.type = "";
	this.component = null;
	this.driver = null;
	this.parent = null;
	this.path = null;
	this.index = 0;
	this.model_bind_path = Runtime.Collection.from([]);
}
Object.assign(Runtime.Web.Frontend.Control.prototype,
{
	copy: function(obj)
	{
		var item = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
		item = Object.assign(item, obj);
		return item;
	}
});


/**
 * Render driver
 */
Runtime.Web.Frontend.RenderDriver = function()
{
	this.remove_keys = [];
	this.animation_id = null;
	this.layout_model = null;
	this.root_attrs = null;
	this.root_elem = null;
	this.root_control = null;
	this.components =
	{
		"": this,
	};
	this.components_id={};
	this.model_bind_path = Runtime.Collection.from([]);
	this.updated_components = [];
	this.context = null;
	this.next_component_id = 0;
}
Object.assign(Runtime.Web.Frontend.RenderDriver.prototype,
{
	getClassName: function()
	{
		return "Runtime.Web.Frontend.RenderDriver";
	},
	
	nextComponentId: function()
	{
		this.next_component_id++;
		return this.next_component_id;
	},
	
	updateComponent: function(component, created)
	{
		this.updated_components.push({"component":component, "created":created});
	},
	
	setModel: function(ctx, bind_model_path, model)
	{
		this.layout_model = Runtime.rtl.setAttr(ctx, this.layout_model, bind_model_path, model);
		this.repaint();
	},
	
	updateModel: function(ctx, bind_model_path, map)
	{
		var model = Runtime.rtl.attr(ctx, this.layout_model, bind_model_path);
		model = model.copy(ctx, map);
		this.layout_model = Runtime.rtl.setAttr(ctx, this.layout_model, bind_model_path, model);
		this.repaint();
	},
	
	updateModelValue: function(ctx, bind_model_path, value)
	{
		this.layout_model = Runtime.rtl.setAttr(ctx, this.layout_model, bind_model_path, value);
		this.repaint();
	},
	
	init: function()
	{
		var attrs = {
			"@bind": Runtime.Collection.from
			([
				"Runtime.Web.Frontend.RenderDriver",
				Runtime.Collection.from([])
			]),
			"@key":""
		};
		
		this.root_attrs = attrs;
		this.root_elem._attrs = attrs;
		this.root_elem._vpath = "";
		this.root_elem._component = this;
		this.root_elem.params = Runtime.Dict.from(attrs);
		this.root_control = new Runtime.Web.Frontend.Control();
		this.root_control.driver = this;
		this.root_control.component = this;
		this.root_control.parent = this.root_elem;
		this.root_control.path = "";
	},
	
	repaint: function()
	{
		if (this.animation_id == null)
		{
			this.animation_id = requestAnimationFrame( this._repaint.bind(this) );
		}
	},
	
	_repaint: function()
	{
		this.animation_id = null;
		this.updated_components = [];
		this.remove_keys = [];
		
		/* Patch root element */
		var res = this.constructor.e
		(
			this.root_control, [],
			"component",
			{
				"name": this.layout_model.layout_class,
				"attrs": this.root_attrs,
			},
			0
		);		
		this.constructor.p(this.root_control, res[1]);
		
		/* Change title */
		if (this.layout_model.title != document.title)
		{
			document.title = this.layout_model.title;
		}
		
		/* Update components */
		for (var i=0; i<this.updated_components.length; i++)
		{
			var c = this.updated_components[i].component;
			c.onUpdate(this.context, this.updated_components[i].created);
			c.old_model = c.model(this.context);
		}
		
		/* TODO this.remove_keys and remove components */
		
		/* Clear */
		this.updated_components = [];
	},
	
	findComponents: function(ctx, class_name)
	{
		var arr = [];
		for (var i in this.components_id)
		{
			var c = this.components_id[i];
			if (Runtime.rtl.is_instanceof(ctx, c, class_name))
			{
				arr.push(c);
			}
		}
		return Runtime.Collection.from(arr);
	},
	
	getComponent: function(path, class_name)
	{
		if (this.components[path] == undefined) return null;
		var path_class_name = this.components[path].getClassName();
		var parents = Runtime.RuntimeUtils.getParents(this.context, path_class_name);
		if (path_class_name != class_name && parents.indexOf(this.context, class_name) == -1)
		{
			return null;
		}
		return this.components[path];
	},
	
	saveComponent: function(component)
	{
		this.components["" + component.path] = component;
		this.components_id[component.component_id] = component;
	},
	
	searchComponent: function(path, class_name)
	{
		var arr = path.split(".");
		while (arr.length > 0)
		{
			var path = arr.join(".");
			var component = this.getComponent(path, class_name);
			if (component != null)
			{
				return component;
			}
			arr.pop();
		}
		if (class_name == this.getClassName()) return this;
		return null;
	},
	
	searchEventMethod: function(path, method_name)
	{
		var class_name = method_name[0];
		var value = method_name[1];
		
		var component = this.searchComponent(path, class_name);
		if (component == null)
		{
			this.constructor.warning("Search event: " + class_name + " not found");
			return null;
		}
	
		var f = component[value];
		if (f == undefined)
		{
			this.constructor.warning(value + " not found in ", component);
			return null;
		}
		
		return f.bind(component);
	},
	
	setReference: function(path, ref_name, elem)
	{
		var class_name = ref_name[0];
		var value = ref_name[1];
		
		var component = this.searchComponent(path, class_name);
		if (component == null)
		{
			this.constructor.warning("Set reference: " + class_name + " not found");
			return;
		}
		
		component[value] = elem;
	},
	
	getBindModelPath: function(path, bind_value)
	{
		var class_name = bind_value[0];
		var bind_name = bind_value[1];
		
		if (typeof bind_name == "string") bind_name = Runtime.Collection.from([bind_name]);
		
		var component = this.searchComponent(path, class_name);
		if (component == null)
		{
			this.constructor.warning("Bind model: " + class_name + " not found");
			return;
		}
		
		var model_bind_path = component.model_bind_path.concat(this.context, bind_name);
		return model_bind_path;
	},
	
	getBindModelValue: function(path, bind_value)
	{
		var model_bind_path = this.getBindModelPath(path, bind_value);
		return this.getModel(model_bind_path);
	},
	
	getModel: function(model_path)
	{
		return Runtime.rtl.attr(this.context, this.layout_model, model_path, null);
	},
	
	setTitle: function(ctx, new_title)
	{
		this.layout_model = this.layout_model.copy(ctx, {"title": new_title});
		this.repaint();
	},
	
	reloadPage: function(ctx, page)
	{
		if (page == undefined)
		{
			document.location = document.location;
		}
		else
		{
			document.location = page;
		}
	},
});
Object.assign(Runtime.Web.Frontend.RenderDriver,
{
	getCurrentNamespace: function()
	{
		return "Runtime.Web.Frontend";
	},
	getCurrentClassName: function()
	{
		return "Runtime.Web.Frontend.RenderDriver";
	},
	getParentClassName: function()
	{
		return "";
	},
	
	
	
	/**
	 * Warning
	 */
	warning: function()
	{
		var arr = Array.apply(null, arguments);
		arr.unshift("[Warning]");
		console.log.apply(null, arr);
	},
	
	
	
	/**
	 * Returns true if is elem
	 */
	isElem(o)
	{
		if (o instanceof HTMLElement || o instanceof Node) return true;
		return false;
	},
	
	
	
	/**
	 * Return HTML elems from string
	 */
	createElementFromHTML(s)
	{
		var res = [];
		var e = document.createElement('div');
		e.innerHTML = s.trim();
		for (var i = 0; i < e.childNodes.length; i++) res.push( e.childNodes[i] );
		return res;
	},
	
	
	
	/**
	 * Decode html entities
	 */
	decodeHtmlEntities(s)
	{
		var e = document.createElement('textarea');
		e.innerHTML = s;
		return e.value;
	},
	
	
	
	/**
	 * Returns elem by index
	 */
	getElemChild: function(parent_elem, index)
	{
		if (index < 0 || index >= parent_elem.childNodes.length) return null;
		return parent_elem.childNodes[index];
	},
	
	
	
	/**
	 * Find elem pos by virtual path
	 */
	findElemPosByPath: function(parent_elem, path)
	{
		for (var i = 0; i < parent_elem.childNodes.length; i++)
		{
			if (parent_elem.childNodes[i]._vpath == path)
			{
				return i;
			}
		}
		return -1;
	},
	
	
	
	/**
	 * Find elem by virtual path
	 */
	findElemByPath: function(parent_elem, vpath, kind)
	{
		var pos = this.findElemPosByPath(parent_elem, vpath);
		return this.getElemChild(parent_elem, pos);
	},
	
	
	
	/**
	 * Find elem by virtual path and check
	 */
	findElemByPathAndCheck: function(parent_elem, vpath, kind)
	{
		var pos = this.findElemPosByPath(parent_elem, vpath);
		var elem_new = this.getElemChild(parent_elem, pos);
		
		/* Check element */
		if (elem_new != null)
		{
			if (kind == "element")
			{
				if (elem_new.tagName == undefined) elem_new = null;
			}
		}
		
		return elem_new;
	},
	
	
	
	/**
	 * Patch DOM with new childs
	 */
	patchElemChilds(parent_elem, new_childs, driver)
	{
		if (new_childs == null) new_childs = [];
		
		var findElementPos = function (elem, e)
		{
			var childs = elem.childNodes;
			for (var i = 0; i < elem.childNodes.length; i++)
			{
				if (childs[i] == e)
				{
					return i;
				}
			}
			return -1;
		}
		
		var insertFirst = function (elem, e)
		{
			if (elem.childNodes.length == 0)
			{
				elem.appendChild(e);
			}
			else
			{
				elem.insertBefore(e, elem.firstChild);
			}
		}
		
		var insertAfter = function (elem, prev, e)
		{
			if (prev == null)
			{
				insertFirst(elem, e);
				return;
			}
			var next = prev.nextSibling;
			if (next == null)
			{
				elem.appendChild(e);
			}
			else
			{
				elem.insertBefore(e, next);
			}
		}
		
		
		/* Remove elems */
		var i = parent_elem.childNodes.length - 1;
		while (i >= 0)
		{
			var e = parent_elem.childNodes[i];
			if (new_childs.indexOf(e) == -1)
			{
				parent_elem.removeChild(e);
				driver.remove_keys.push(e._key);
				/* console.log('Remove child ', i); */
			}
			i--;
		}
		
		
		var prevElem = null;
		for (var i=0; i<new_childs.length; i++)
		{
			var new_e = new_childs[i];
			if (typeof new_e == "string")
			{
				new_e = document.createTextNode(new_e);
			}
			
			var pos = findElementPos(parent_elem, new_e);
			var flag = false;
			
			/* If new element */
			if (pos == -1)
			{
				if (prevElem == null)
				{
					insertFirst(parent_elem, new_e);
					flag = true;
					/* console.log('Insert first ', i); */
				}
				else
				{
					insertAfter(parent_elem, prevElem, new_e);
					flag = true;
					/* console.log('Insert after[1] ', i); */
				}
			}
			
			/* If existing element */
			else
			{
				if (pos - 1 < 0)
				{
					if (i != 0)
					{
						insertAfter(parent_elem, prevElem, new_e);
						flag = true;
						/* console.log('Insert after[2] ', i); */
					}
				}
				else
				{
					var prevSibling = parent_elem.childNodes[pos - 1];
					if (prevElem != prevSibling)
					{
						insertAfter(parent_elem, prevElem, new_e);
						flag = true;
						/* console.log('Insert after[3] ', i); */
					}
				}
			}
			
			if (flag)
			{
				var index = driver.remove_keys.indexOf(new_e._key);
				if (index != -1)
					driver.remove_keys.splice(index, 1);
			}
			
			prevElem = new_e;
		}
	},
	
	
	
	/**
	 * Build Virtual Path
	 */
	buildPath: function(control, params, index)
	{
		var vkey = "";
		if (params != null)
		{
			if (params["@key"] != undefined) vkey = params["@key"];
		}
		if (vkey == "")
		{
			vkey = "" + index;
		}
		var path = control.path;
		return path + ((path != "") ? "." : "") + vkey;
	},
	
	
	
	/**
	 * Update elem params
	 */
	updateElemParams: function(control, elem)
	{
		var model = control.model;
		var driver = control.driver;
		var is_new_elem = control.is_new_elem;
		var component = elem._component;
		var attrs = elem._attrs;
		var path = elem._vpath;
		
		if (control.path != elem._vpath)
		{
			console.log("--------------");
			console.log(control.path);
			console.log(elem._vpath);
		}
		
		/* Set attrs */
		if (attrs != null)
		{
			/* Add attributes */
			for (var key in attrs)
			{
				var value = attrs[key];
				if (key == "@bind")
				{
					value = driver.getBindModelValue(path, value);
				}
				if (key == "value" || key == "@bind")
				{
					if (elem.tagName == "INPUT" || elem.tagName == "SELECT" || elem.tagName == "TEXTAREA")
					{
						if (elem.value != value) elem.value = value;
						continue;
					}
				}
				if (key[0] == "@") continue;
				if (elem.getAttribute(key) != value)
				{
					elem.setAttribute(key, value);
				}
			}
			
			/* Remove old attributes */
			for (var i=elem.attributes.length - 1; i>=0; i--)
			{
				var attr = elem.attributes[i];
				if (attrs[attr.name] == undefined)
				{
					elem.removeAttribute(attr.name);
				}
			}
			
			/* Set reference */
			if (attrs["@ref"] != undefined)
			{
				driver.setReference(component.path, attrs["@ref"], elem);
			}
			
			/* Bind element events */
			if (is_new_elem)
			{
				for (var key in attrs)
				{
					var value = attrs[key];
					var is_event = key.substring(0, 7) == "@event:";
					var is_event_async = key.substring(0, 12) == "@eventAsync:";
					if (key == "@bind")
					{
						var f = function (driver, elem, bind_value)
						{ 
							return function (e) 
							{
								var model_bind_path = driver.getBindModelPath(path, bind_value);
								driver.updateModelValue(driver.context, model_bind_path, elem.value);
							}
						};
						elem.addEventListener
						(
							"change",
							f(driver, elem, value)
						);
					}
					else if (is_event || is_event_async)
					{
						var event_name = "";
						if (is_event) event_name = key.substring(7);
						if (is_event_async) event_name = key.substring(12);
						
						var event_class = use(event_name);
						if (event_class == undefined)
						{
							this.warning("Event " + event_name + " not found in ", elem);
							continue;
						}
						
						var es6_name = event_class.ES6_EVENT_NAME;
						if (es6_name == undefined) continue;
						
						/* console.log("Event " + event_name, elem); */
						
						var is_async = is_event_async && !is_event;
						var f_event = function (driver, elem, attrs, key, is_async)
						{
							return function (e) 
							{
								var value = attrs[key];
								var f = driver.searchEventMethod(elem._vpath, value);
								if (!f)
								{
									return;
								}
								
								var event = Runtime.Web.Events.WebEvent.fromEvent(driver.context, e);
								if (is_async)
								{
									Runtime.rtl.applyAwait(driver.context, f, [event]);
								}
								else
								{
									f(driver.context, event);
								}
							}
						};
						/*
						console.log
						(
							"addEventListener",
							elem, params
						);
						*/
						elem.addEventListener
						(
							es6_name,
							f_event(driver, elem, attrs, key, is_async)
						);
					}
				}
			}
		}
	},
	
	
	
	/**
	 * Normalize childs
	 */
	_normalizeChilds: function(res, childs)
	{
		for (var i=0; i<childs.length; i++)
		{
			var item = childs[i];
			if (item instanceof Array)
			{
				res = this._normalizeChilds(res, item);
			}
			else
			{
				res.push(item);
			}
		}
		return res;
	},
	
	
	
	/**
	 * Normalize content
	 */
	normalizeContent: function(content, control)
	{
		if (content == null) return null;
		if (typeof content == "function" || content instanceof Function) content = content(control);
		if (this.isElem(content)) return content;
		if (content instanceof Array)
		{
			var new_content = [];
			for (var i=0; i<content.length; i++)
			{
				var item = this.normalizeContent(content[i], control);
				new_content.push(item);
			}
			
			var res = [];
			this._normalizeChilds(res, new_content);
			
			return res;
		}
		
		return content;
	},
	
	
	
	/**
	 * Element
	 */
	e: function (control, childs, type, obj, index, elem_flag)
	{
		var new_control = null;
		var parent_elem = control.parent;
		var name = (obj != null) ? obj.name : "";
		var attrs = (obj != null && obj.attrs != null && obj.attrs != undefined) ? obj.attrs : null;
		var content = (obj != null && obj.content != null && obj.content != undefined) ? obj.content : null;
		var path = this.buildPath(control, attrs, index);
		var driver = control.driver;
		
		if (type == 'component')
		{
			var model = null;
			var model_bind_name = null;
			var model_bind_path = null;
			var created = false;
			
			/* Find class */
			var class_obj = use(name);
			if (class_obj == undefined)
			{
				throw new Error("Component " + name + " not found");
			}
			
			/* Find component */
			var component = driver.getComponent(path, name);
			if (component == null)
			{
				/* Create component */
				component = new class_obj();
				component.component_id = driver.nextComponentId();
				component.path = path;
				component.driver = driver;
				driver.saveComponent(component);
				created = true;
			}
			
			/* Find model */
			if (attrs != null && attrs["@bind"] != undefined)
			{
				model_bind_path = driver.getBindModelPath(path, attrs["@bind"]);
			}
			
			/* Get model */
			if (model_bind_path != null)
			{
				model = Runtime.rtl.attr(driver.context, driver.layout_model, model_bind_path, null);
				attrs["value"] = model;
			}
			
			/* Set new model */
			component.driverSetParams(driver.context, Runtime.Dict.from(attrs));
			component.driverSetModel(driver.context, model_bind_path);
			component.parent_component = control.component;
			
			/* Set reference */
			if (attrs != null && attrs["@ref"] != undefined)
			{
				driver.setReference(component.parent_component.path, attrs["@ref"], component);
			}
			
			/* Create new control */
			new_control = control.copy({
				"type": type,
				"index": index,
				"path": path,
				"component": component,
				"model": model,
			});
			
			/* Render component */
			var render = class_obj.render.bind(class_obj);
			var res = render
			(
				driver.context, driver.layout_model, model, Runtime.Dict.from(attrs), content
			);
			
			/* Call result */
			if (res != null && typeof res == "function") res = res(new_control);
			
			/* Normalize content */
			res = this.normalizeContent(res, new_control);
			
			/* Add childs */
			childs = childs.slice();
			childs.push(res);
			
			driver.updateComponent(component, created);
		}
		
		else if (type == 'element')
		{
			var elem_new = this.findElemByPathAndCheck(parent_elem, path, type);
			var is_new_elem = false;
			
			/* Create new element */
			if (elem_new == null)
			{
				elem_new = document.createElement(name);
				is_new_elem = true;
			}
			
			/* Create new control */
			new_control = control.copy({
				"type": type,
				"index": index,
				"path": path,
				"parent": elem_new,
				"is_new_elem": is_new_elem,
			});
			
			/* Update element params */
			elem_new._attrs = attrs;
			elem_new._vpath = path;
			elem_new._component = control.component;
			elem_new.params = Runtime.Dict.from(attrs);
			
			/* Patch element params */
			if (elem_flag === false)
			{
				this.updateElemParams(new_control, elem_new);
			}
			
			/* Add childs */
			childs = childs.slice();
			childs.push(elem_new);
		}
		
		else if (this.isElem(content))
		{
			childs = childs.slice();
			childs.push(content);
		}
		else if (content instanceof Array)
		{
			childs = childs.slice();
			childs.push(content);
		}
		else if (typeof content == "function" || content instanceof Function)
		{
			childs = childs.slice();
			
			/* Create new control */
			new_control = control.copy({
				"type": type,
				"index": index,
				"path": path,
			});
			content = this.normalizeContent(content, new_control);
			childs.push(content);
		}
		
		else if (type == 'raw')
		{
			/* To string */
			content = Runtime.rtl.toStr(content);
			
			/* Create new element */
			var elem_new = this.createElementFromHTML(content);
			
			/* Add childs */
			childs = childs.slice();
			childs.push(elem_new);
		}
		
		else if (type == 'text')
		{
			/* To string */
			content = Runtime.rtl.toStr(content);
			content = this.decodeHtmlEntities(content);
			
			var elem_new = this.findElemByPathAndCheck(parent_elem, path, type);
			
			/* Create new element */
			if (elem_new == null)
			{
				elem_new = document.createTextNode(content);
			}
			else
			{
				if (elem_new.nodeValue != content)
				{
					elem_new.nodeValue = content;
				}
			}
			
			/* Set elem path */
			elem_new._vpath = path;
			
			/* Add childs */
			childs = childs.slice();
			childs.push(elem_new);
		}
		
		else if (type == 'html')
		{
			
		}
		
		else if (type == 'empty')
		{
			new_control = control;
		}
		
		return [new_control, childs];
	},
	
	
	
	/**
	 * Patch childs of the control
	 */
	p: function (control, childs)
	{
		if (control.type == "empty")
		{
			return;
		}
		
		/* Normalize content */
		var childs = this.normalizeContent(childs, control);
		
		/* Patch element */
		this.patchElemChilds(control.parent, childs, control.driver);
		
		/* Patch element params */
		this.updateElemParams(control, control.parent);
	},
	
	
	
	/**
	 * Run driver
	 */
	run: function(context, selector, layout_model)
	{
		var driver = new Runtime.Web.Frontend.RenderDriver();
		driver.context = context;
		driver.layout_model = layout_model;
		driver.root_elem = document.querySelector(selector);
		driver.init();
		driver.repaint();
		return driver;
	}
});
Runtime.rtl.defClass(Runtime.Web.Frontend.RenderDriver);


try
{
	var layout_model = Runtime.rs.base64_decode_url
	(
		null, document.getElementById('layout_model').value
	);
	layout_model = Runtime.RuntimeUtils.json_decode(null, layout_model);
	window['layout_model'] = layout_model;
	global_context = Runtime.Context.create
	(
		null,
		"",
		layout_model.frontend_env
	);
	global_context = global_context.copy
	(
		null,
		Runtime.Dict.from({
			"modules": layout_model.frontend_modules,
			"settings": layout_model.frontend_settings,
		})
	);
	Runtime.RuntimeUtils.setContext(global_context);
	global_context = global_context.constructor.init(global_context, global_context);
	/* global_context = global_context.constructor.start(global_context, global_context); */
	window['global_context'] = global_context;
	window['RenderDriverInstance'] = Runtime.Web.Frontend.RenderDriver.run
	(
		global_context,
		'#frontend_root',
		layout_model
	);
	window['RenderDriver'] = Runtime.Web.Frontend.RenderDriver;
}
catch (ex)
{
	console.log(ex.stack);
}