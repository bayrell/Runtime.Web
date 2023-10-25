"use strict;"
/*!
 *  Bayrell Runtime Library
 *
 *  (c) Copyright 2016-2023 "Ildar Bikmamatov" <support@bayrell.org>
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
if (typeof Runtime == 'undefined') Runtime = {};
if (typeof Runtime.Web == 'undefined') Runtime.Web = {};
Runtime.Web.RenderProvider = function()
{
	Runtime.BaseProvider.apply(this, arguments);
	if (window) window["render_provider"] = this;
	this.vdom = null;
	this.layout = null;
	this.render_vdom_list = [];
	this.render_elem_list = [];
	this.render_elem_obj = {};
	this.render_elem_childs_list = [];
	this.render_elem_childs_obj = {};
	this.is_first_render = false;
	this.animation_frame = null;
	this.constructor.is_debug = false;
	this.js_event_bind = this.js_event.bind(this);
	this.js_href_click_bind = this.js_href_click.bind(this);
	this.model_path = new Runtime.Collection();
	this.history = new Runtime.Vector();
	this.enable_lazy_load = false;
};
Runtime.Web.RenderProvider.prototype = Object.create(Runtime.BaseProvider.prototype);
Runtime.Web.RenderProvider.prototype.constructor = Runtime.Web.RenderProvider;
Object.assign(Runtime.Web.RenderProvider.prototype,
{
	/**
	 * Start driver
	 */
	start: function()
	{
		/* window.requestAnimationFrame( this.animationFrame.bind(this) ); */
		
		/* Add history listener */
		if (this.enable_lazy_load)
		{
			window.onpopstate = this.js_onpopstate.bind(this);
		}
	},
	
	
	/**
	 * Returns model by model path
	 */
	model: function(model_path)
	{
		if (model_path == null) return null;
		return Runtime.rtl.attr(this.layout, model_path);
	},
	
	
	/**
	 * Returns page model proxy
	 */
	modelProxy: function(path)
	{
		return new Runtime.ModelProxy(
			this,
			Runtime.Collection.from(["layout", "pages", this.layout.page_model_class_name])
				.concat(path)
		);
	},
	
	
	/**
	 * Returns layout proxy
	 */
	layoutProxy: function(path)
	{
		return new Runtime.ModelProxy(
			this,
			Runtime.Collection.from(["layout"]).concat(path)
		);
	},
	
	
	/**
	 * Commit layout
	 */
	commitComponent: function(component, new_model)
	{
		/* Get changes */
		let old_model = Runtime.rtl.attr(this.layout, component.model_path);
		
		/* Set new layout */
		this.layout = Runtime.rtl.setAttr(this.layout, component.model_path, new_model);
		
		/* On update model */
		this.onUpdateModel(component.model_path, old_model, new_model);
	},
	
	
	/**
	 * On update model
	 */
	onUpdateModel(model_path, old_model, new_model)
	{
		let changes = {};
		
		/* Send commit message */
		let msg = new Runtime.Web.Message();
		msg.event = new Runtime.Web.Events.CommitModelEvent({
			"model_path": model_path,
			"old_model": old_model,
			"new_model": new_model,
			"changes": changes,
		});
		
		let context = Runtime.rtl.getContext();
		let listener = context.provider("Runtime.Web.Listener");
		/* listener.dispatch(msg); */
		
		/* If not cancel repaint all */
		if (!msg.is_cancel)
		{
			this.repaintRef(this.vdom);
		}
	},
	
	
	/**
	 * Repaint virtual DOM reference
	 */
	repaintRef: function(vdom)
	{
		if (vdom == null) return;
		
		this.render_vdom_list.push(vdom);
		this.addChangedElem(vdom);
		this.requestAnimationFrame();
	},
	
	
	/**
	 * Add changed virtual dom
	 */
	addChangedElem: function(vdom)
	{
		if (vdom == null) return;
		
		let vdom_path_id = vdom.path_id.join(":");
		if (this.render_elem_obj[vdom_path_id] != undefined) return;
		
		this.render_elem_obj[vdom_path_id] = 1;
		this.render_elem_list.push(vdom);
	},
	
	
	/**
	 * Add changed childs virtual dom
	 */
	addChangedElemChilds: function(vdom)
	{
		if (vdom == null) return;
		
		let vdom_path_id = vdom.path_id.join(":");
		if (this.render_elem_childs_obj[vdom_path_id] != undefined) return;
		
		this.render_elem_childs_list.push(vdom);
		this.render_elem_childs_obj[vdom_path_id] = 1;
	},
	
	
	/**
	 * Call render
	 */
	render: function()
	{
		let render_vdom_list = this.render_vdom_list;
		
		/* Render virtual dom */
		for (let i=0; i<this.render_vdom_list.length; i++)
		{
			let vdom = render_vdom_list[i];
			if (vdom.render)
			{
				vdom.render(vdom);
				vdom.p();
			}
			else if (vdom.isComponent())
			{
				/* Get render function */
				let component = vdom.component;
				let params = component.params;
				let content = component.content;
				let render = Runtime.rtl.method(
					vdom.component.constructor.getClassName(),
					"render"
				);
				
				/* Render component */
				let f = render(component, params, content);
				f(vdom);
				vdom.p();
			}
		}
		
		this.render_vdom_list = [];
		
		/* Repaint */
		this.repaint();
	},
	
	
	/**
	 * Repaint
	 */
	repaint: function()
	{
		/* Render changed elements */
		let render_elem_list = this.render_elem_list;
		
		/* console.log("Repaint " + this.render_elem_list.length + " items"); */
		
		/* Create elements or update params */
		for (let i=0; i<this.render_elem_list.length; i++)
		{
			let vdom = render_elem_list[i];
			this.updateElem(vdom);
			
			let parent_vdom = vdom.getParentElement();
			this.addChangedElemChilds(parent_vdom);
		}
		
		/* Update elements childs */
		let render_elem_childs_list_sz = this.render_elem_childs_list.length;
		for (let i=render_elem_childs_list_sz-1; i>=0; i--)
		{
			let vdom = this.render_elem_childs_list[i];
			this.updateElemChilds(vdom);
		}
		
		/* Component repaint */
		for (let i=0; i<this.render_elem_list.length; i++)
		{
			let vdom = render_elem_list[i];
			if (vdom.kind == Runtime.Web.VirtualDom.KIND_COMPONENT)
			{
				vdom.component.onRepaint();
			}
		}
		
		this.render_elem_list = [];
		this.render_elem_obj = {};
		this.render_elem_childs_list = [];
		this.render_elem_childs_obj = {};
	},
	
	
	/**
	 * Animation frame
	 */
	animationFrame: function(time)
	{
		this.animation_frame = null;
		
		let render_vdom_list = this.render_vdom_list;
		if (render_vdom_list.length == 0) return;
		
		/* Render scene */
		this.render();
	},
	
	
	/**
	 * Request animation frame
	 */
	requestAnimationFrame: function()
	{
		if (this.animation_frame == null)
		{
			this.animation_frame = window.requestAnimationFrame( this.animationFrame.bind(this) );
		}
	},
	
	
	/**
	 * Render root
	 */
	renderRoot: function(elem_root, layout_class_name, layout)
	{
		/* Setup layout */
		this.layout = layout;
		
		/* Create virtual dom */
		this.vdom = new Runtime.Web.VirtualDom();
		this.vdom.kind = Runtime.Web.VirtualDom.KIND_ELEMENT;
		this.vdom.path_id = Runtime.Collection.from([]);
		this.vdom.params = Runtime.Dict();
		this.vdom.elem = elem_root;
		this.vdom.render = (vdom) => {
			vdom.e("c", layout_class_name, Runtime.Dict.from({
				"@model":[this, Runtime.Collection.from("")],
			}), null);
		};
		
		this.is_first_render = true;
		
		this.render_vdom_list.push(this.vdom);
		this.addChangedElem(this.vdom);
		this.render();
		
		this.is_first_render = false;
	},
	
	
	/**
	 * Update element childs
	 */
	updateElemChilds: function(vdom)
	{
		if (!vdom.is_change_childs) return;
		if (!vdom.isElement()) return;
		if (vdom.isText()) return;
		
		vdom.is_change_childs = false;
		
		/* Get vdom HTML childs */
		let new_childs = vdom.getChildElements();
		new_childs = new_childs
			.map( (item) => item.elem )
			.flatten()
			.filter( Runtime.lib.equalNot(null) )
		;
		
		/* Patch HTML element childs */
		this.constructor.patchElemChilds(vdom.elem, new_childs);
	},
	
	
	/**
	 * Update element in animation frame
	 */
	updateElem: function(vdom)
	{
		/* Setup exists childs for first init */
		if (this.is_first_render)
		{
			if (vdom.kind == Runtime.Web.VirtualDom.KIND_ELEMENT)
			{
				if (vdom.elem != null)
				{
					var findVirtualDomPos = function (nodes, vdom)
					{
						for (var i = 0; i < nodes.count(); i++)
						{
							let node = nodes[i];
							
							if (node instanceof HTMLElement &&
								vdom.kind == Runtime.Web.VirtualDom.KIND_ELEMENT)
							{
								if (node.tagName == vdom.name.toUpperCase())
								{
									return i;
								}
							}
							
							if (node instanceof Text &&
								vdom.kind == Runtime.Web.VirtualDom.KIND_TEXT)
							{
								if (node.textContent == vdom.content)
								{
									return i;
								}
							}
						}
						
						return -1;
					}
					
					let new_childs = vdom.getChildElements();
					let parent_elem = vdom.elem;
					let old_childs = Runtime.Vector.from([...parent_elem.childNodes]);
					
					old_childs = old_childs
						.map(
							(item) => {
								if (item.tagName == "TBODY")
								{
									return Runtime.Vector.from([...item.childNodes]);
								}
								return item;
							}
						)
						.flatten()
					;
					
					for (let i=0; i<new_childs.count(); i++)
					{
						let pos = findVirtualDomPos(old_childs, new_childs[i]);
						if (pos >= 0)
						{
							new_childs[i].elem = old_childs[pos];
							new_childs[i].elem._vdom = new_childs[i];
							old_childs.removePosition(pos);
						}
					}
					
				}
				else
				{
					//console.log("elem is null");
					//console.log(vdom);
				}
			}
		}
		
		if (vdom.kind == Runtime.Web.VirtualDom.KIND_ELEMENT)
		{
			if (vdom.elem == null)
			{
				vdom.elem = this.constructor.createElem(vdom.name, vdom.content);
				vdom.elem._vdom = vdom;
			}
		}
		
		else if (vdom.kind == Runtime.Web.VirtualDom.KIND_TEXT)
		{
			/* Create elem */
			if (vdom.elem == null)
			{
				vdom.elem = document.createTextNode(
					Runtime.rtl.exists(vdom.content) ? vdom.content : ""
				);
				vdom.elem._vdom = vdom;
			}
			else
			{
				/* Set new text */
				if (vdom.elem.nodeValue != vdom.content)
				{
					vdom.elem.nodeValue = vdom.content;
				}
			}
		}
		
		else if (vdom.kind == Runtime.Web.VirtualDom.KIND_RAW)
		{
			var findElementPos = function (nodes, find_e)
			{
				for (let i = 0; i < nodes.count(); i++)
				{
					let node = nodes[i];
					
					if (node._attached == true)
					{
						continue;
					}
					
					if (node instanceof HTMLElement &&
						find_e instanceof HTMLElement)
					{
						if (node.tagName != find_e.tagName)
						{
							continue;
						}
						if (node.outerHTML == find_e.outerHTML)
						{
							return i;
						}
					}
					
					if (node instanceof Text &&
						find_e instanceof Text)
					{
						if (node.textContent == find_e.textContent)
						{
							return i;
						}
					}
				}
				
				return -1;
			}
			
			let parent_elem = vdom.getParentElement().elem;
			let old_childs = Runtime.Vector.from([...parent_elem.childNodes]);
			let new_childs = this.constructor.rawHtml(vdom.content);
			
			if (this.is_first_render)
			{
				let res = [];
				
				for (let i=0; i<new_childs.count(); i++)
				{
					let pos = findElementPos(old_childs, new_childs[i]);
					if (pos >= 0)
					{
						res.push(old_childs[pos]);
						old_childs[pos]._attached = true;
					}
					else
					{
						res.push(new_childs[i]);
					}
				}
				
				vdom.elem = Runtime.Collection.from(res);
			}
			else
			{
				vdom.elem = new_childs;
			}
		}
		
		else if (vdom.kind == Runtime.Web.VirtualDom.KIND_COMPONENT)
		{
			vdom.component.onUpdateElem();
		}
		
		this.updateElemParams(vdom);
	},
	
	
	/**
	 * Update element params
	 */
	updateElemParams: function(vdom)
	{
		if (!vdom.params) return;
		
		let used_attrs = {};
		let elem = vdom.elem;
		let keys = vdom.params.keys();
		for (let i=0; i<keys.count(); i++)
		{
			let key = keys[i];
			let value = vdom.params.get(key);
			
			/* Set reference */
			if (key == "@ref")
			{
				let component = value[0];
				let ref_name = value[1];
				component.setRef(ref_name, vdom);
				continue;
			}
			
			/* Set event */
			let is_event = false;
			let event_class_name = "";
			let es6_event_name = "";
			if (key.substr(0, 7) == "@event:")
			{
				is_event = true;
				event_class_name = key.substr(7);
				let getES6EventName = Runtime.rtl.method(event_class_name, "getES6EventName");
				es6_event_name = getES6EventName();
			}
			if (is_event)
			{
				let context = Runtime.rtl.getContext();
				let listener = context.provider("Runtime.Web.Listener");
				let component = value[0];
				let method_name = value[1];
				
				listener.addCallback(
					vdom.path_id.join(":"),
					event_class_name, 
					component,
					method_name,
				);
				
				if (vdom.is_new_element && es6_event_name != "" && vdom.isElement())
				{
					vdom.elem.addEventListener(es6_event_name, this.js_event_bind);
				}
				
				continue;
			}
			
			/* Set value */
			if (key == "value" && vdom.kind == Runtime.Web.VirtualDom.KIND_ELEMENT)
			{
				if (
					elem.tagName == "INPUT" ||
					elem.tagName == "SELECT" ||
					elem.tagName == "TEXTAREA" ||
					elem.tagName == "OPTION"
				)
				{
					if (value == null || value == "")
					{
						if (elem.value != "")
						{
							elem.value = "";
						}
					}
					else if (elem.value != value)
					{
						elem.value = value;
						if (
							elem.tagName == "INPUT" ||
							elem.tagName == "SELECT" ||
							elem.tagName == "OPTION"
						)
						{
							elem.setAttribute("value", value);
						}
					}
					used_attrs[key] = value;
					elem._old_value = value;
				}
				continue;
			}
			
			/* Element style */
			if (key == "style" && value instanceof Runtime.Dict)
			{
				value = value.transition(
					(v, k) => { return k + ": " + v; }
				);
				value = value.join(";");
			}
			
			/* Set attribute */
			if (key[0] != "@" && vdom.kind == Runtime.Web.VirtualDom.KIND_ELEMENT)
			{
				if (elem.getAttribute(key) != value)
				{
					elem.setAttribute(key, value);
				}
				used_attrs[key] = value;
			}
		}
		
		/* Remove old attributes */
		if (!this.is_first_render && vdom.kind == Runtime.Web.VirtualDom.KIND_ELEMENT)
		{
			let elem_attrs = elem.getAttributeNames();
			for (let i=0; i<elem_attrs.length; i++)
			{
				let attr_name = elem_attrs[i];
				if (used_attrs[attr_name] == undefined)
				{
					elem.removeAttribute(attr_name);
				}
			}
		}
		
		/* Lazy load event */
		if (this.enable_lazy_load && vdom.is_new_element && elem != null)
		{
			if (elem.tagName == "A" && elem.classList.contains('lazy_load'))
			{
				elem.addEventListener("click", this.js_href_click_bind);
			}
		}
	},
	
	
	/**
	 * Open URL
	 */
	openUrl: async function(href, add_history)
	{
		if (add_history == undefined) add_history = true;
		
		var obj = { "href": href, };
		history.pushState(obj, "", href);
		
		this.history.pushValue(href);
		
		await this.renderPage(href);
	},
	
	
	/**
	 * Render page
	 */
	renderPage: async function(href)
	{
		let context = Runtime.rtl.getContext();
		let app = context.app;
		
		/* Save models */
		let models = this.layout.models;
		
		/* Create request */
		let obj = {
			"method": "GET",
			"protocol": document.location.protocol.slice(0,-1),
			"host": document.location.host,
		};
		let request = new Runtime.Web.Request(Runtime.Dict.from(obj));
		request = request.init(href);
		
		/* Create container */
		let container = new Runtime.Web.RenderContainer();
		container.request = request;
		
		/* Init container */
		await app.initContainer(container);
		
		/* Setup layout */
		container.layout = this.layout;
		
		/* Resolve container */
		await app.resolveContainer(container, models);
		
		/* Render */
		this.layout = container.layout;
		this.repaintRef(this.vdom);
	},
	
	
	/**
	 * JS event
	 */
	js_event: function(e)
	{
		let msg = null;
		let context = Runtime.rtl.getContext();
		let listener = context.provider("Runtime.Web.Listener");
		
		let vdom = e.currentTarget._vdom;
		
		msg = new Runtime.Web.Message( Runtime.Web.Events.WebEvent.fromEvent(e) );
		msg.dest = "";
		msg.sender = vdom;
		
		listener.dispatch(msg);
	},
	
	
	/**
	 * Lazy load
	 */
	js_href_click: function(e)
	{
		var elem = e.currentTarget;
		if (elem.tagName == "A" && elem.classList.contains('lazy_load'))
		{
			var target = elem.getAttribute("target");
			var href = elem.getAttribute("href");
			
			if (target == null)
			{
				e.preventDefault();
				
				(async () => {
					try { await this.openUrl(href); }
					catch (e) { console.log(e.stack); }
				})();
				
				return false;
			}
		}
	},
	
	
	/**
	 * Pos state event
	 */
	js_onpopstate: function(e)
	{
		if (this.history.count() == 0)
		{
			document.location = document.location;
		}
		else
		{
			let href = "/";
			if (e.state != null && typeof e.state.href == "string")
			{
				href = e.state.href;
			}
			
			this.history.pop();
			
			(async () => {
				try { await this.openUrl(href, false); }
				catch (e) { console.log(e.stack); }
			})();
		}
	},
	
	assignValue: function(k,v)
	{
		if (k == "layout")this.layout = v;
		else Runtime.BaseProvider.prototype.assignValue.call(this,k,v);
	},
	takeValue: function(k,d)
	{
		if (d == undefined) d = null;
		if (k == "layout")return this.layout;
		return Runtime.BaseProvider.prototype.takeValue.call(this,k,d);
	},
});
Object.assign(Runtime.Web.RenderProvider, Runtime.BaseProvider);
Object.assign(Runtime.Web.RenderProvider,
{
	
	/**
	 * Create element
	 */
	createElem(name, content)
	{
		if (name == "svg")
		{
			instance = document.createElementNS("http://www.w3.org/2000/svg", "svg");
			
			/* Patch content */
			var e = document.createElement("div");
			e.innerHTML = "<svg>" + (content ? content : "") + "</svg>";
			var item = e.childNodes[0];
			while (item.childNodes.length > 0)
			{
				var e = item.childNodes[0];
				instance.appendChild(e);
			}
		}
		else
		{
			instance = document.createElement(name);
		}
		
		return instance;
	},
	
	
	/**
	 * Create raw html
	 */
	rawHtml(content)
	{
		var res = [];
		var e = document.createElement('div');
		e.innerHTML = Runtime.rs.trim(content)
		for (var i = 0; i < e.childNodes.length; i++) res.push( e.childNodes[i] );
		return Runtime.Collection.from(res);
	},
	
	
	/**
	 * Patch DOM with new childs
	 */
	patchElemChilds: function(parent_elem, new_childs)
	{
		if (new_childs == null) new_childs = [];
		
		var is_debug = false;
		is_debug = this.is_debug;
		
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
		
		/* Remove old elems if does not exists in new_childs */
		var i = parent_elem.childNodes.length - 1;
		while (i >= 0)
		{
			var e = parent_elem.childNodes[i];
			if (new_childs.indexOf(e) == -1)
			{
				parent_elem.removeChild(e);
				if (e._path_id != undefined)
				{
					this.remove_keys.pushValue(null, e._path_id);
				}
				if (is_debug) console.log('Remove child ', i, e);
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
					if (is_debug) console.log('Insert first ', i, new_e);
				}
				else
				{
					insertAfter(parent_elem, prevElem, new_e);
					flag = true;
					if (is_debug) console.log('Insert after[1] ', i, new_e);
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
						if (is_debug) console.log('Insert after[2] ', i, new_e);
					}
				}
				else
				{
					var prevSibling = parent_elem.childNodes[pos - 1];
					if (prevElem != prevSibling)
					{
						insertAfter(parent_elem, prevElem, new_e);
						flag = true;
						if (is_debug) console.log('Insert after[3] ', i, new_e);
					}
				}
			}
			/*
			if (flag)
			{
				var index = this.remove_keys.indexOf(null, new_e._path_id);
				if (index != -1)
					this.remove_keys.remove(null, index, 1);
			}
			*/
			prevElem = new_e;
		}
	},
	
	/* ======================= Class Init Functions ======================= */
	getNamespace: function()
	{
		return "Runtime.Web";
	},
	getClassName: function()
	{
		return "Runtime.Web.RenderProvider";
	},
	getParentClassName: function()
	{
		return "Runtime.BaseProvider";
	},
	getClassInfo: function()
	{
		var Collection = Runtime.Collection;
		var Dict = Runtime.Dict;
		return Dict.from({
			"annotations": Collection.from([
			]),
		});
	},
	getFieldsList: function(f)
	{
		var a = [];
		if (f==undefined) f=0;
		return Runtime.Collection.from(a);
	},
	getFieldInfoByName: function(field_name)
	{
		var Collection = Runtime.Collection;
		var Dict = Runtime.Dict;
		return null;
	},
	getMethodsList: function(f)
	{
		if (f==undefined) f=0;
		var a = [];
		if ((f&4)==4) a=[
		];
		return Runtime.Collection.from(a);
	},
	getMethodInfoByName: function(field_name)
	{
		return null;
	},
});
Runtime.rtl.defClass(Runtime.Web.RenderProvider);
window["Runtime.Web.RenderProvider"] = Runtime.Web.RenderProvider;