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
	this.render_vdom_list = new Runtime.Collection();
	this.render_elem_list = new Runtime.Collection();
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
		window.requestAnimationFrame( this.animationFrame.bind(this) );
	},
	
	
	/**
	 * Returns model by model path
	 */
	model: function(model_path)
	{
		return Runtime.rtl.attr(this.layout, model_path);
	},
	
	
	/**
	 * Commit layout
	 */
	commit: function(model_path, model)
	{
		this.layout = Runtime.rtl.setAttr(this.layout, model_path, model);
	},
	
	
	/**
	 * Repaint virtual DOM reference
	 */
	repaintRef: function(vdom)
	{
		if (vdom)
		{
			this.render_vdom_list = this.render_vdom_list.pushIm(vdom);
		}
	},
	
	
	/**
	 * Add changed virtual dom
	 */
	addChangedElem: function(vdom)
	{
		this.render_elem_list = this.render_elem_list.pushIm(vdom);
	},
	
	
	/**
	 * Call render
	 */
	render: function()
	{
		/* Render virtual dom */
		let render_vdom_list = this.render_vdom_list;
		let render_vdom_list_sz = render_vdom_list.count();
		
		for (let i=0; i<render_vdom_list_sz; i++)
		{
			let vdom = render_vdom_list[i];
			if (vdom.render)
			{
				if (vdom.isElement()) this.addChangedElem(vdom);
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
		this.render_vdom_list = new Runtime.Collection();
		
		/* Render changed elements */
		let render_elem_list = this.render_elem_list;
		let render_elem_list_sz = render_elem_list.count();
		
		/* Create elements or update params */
		for (let i=0; i<render_elem_list_sz; i++)
		{
			let vdom = render_elem_list[i];
			this.updateElem(vdom);
		}
		
		/* Update elements childs */
		for (let i=render_elem_list_sz-1; i>=0; i--)
		{
			let vdom = render_elem_list[i];
			if (vdom.isElement() && !vdom.isText())
			{
				this.updateElemChilds(vdom);
			}
		}
		
		this.render_elem_list = new Runtime.Collection();
	},
	
	
	/**
	 * Animation frame
	 */
	animationFrame: function(time)
	{
		let render_vdom_list = this.render_vdom_list;
		if (render_vdom_list.count() > 0)
		{
			this.render();
		}
		window.requestAnimationFrame( this.animationFrame.bind(this) );
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
			vdom.e("c", layout_class_name, Runtime.Dict.from({}), null);
		};
		this.repaintRef(this.vdom);
		
		/* Call render */
		this.render();
	},
	
	
	/**
	 * Update element childs
	 */
	updateElemChilds: function(vdom)
	{
		if (!vdom.is_change_childs) return;
		vdom.is_change_childs = false;
		
		let parent_vdom = vdom;
		
		/* Get parent element */
		while (!parent_vdom.isElement()) parent_vdom = parent_vdom.parent_vdom;
		if (!parent_vdom) return;
		
		/* Get vdom HTML childs */
		let new_childs = parent_vdom.getChildElements();
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
			vdom.elem = this.constructor.rawHtml(vdom.content);
		}
		
		this.updateElemParams(vdom);
	},
	
	
	/**
	 * Update element params
	 */
	updateElemParams: function(vdom)
	{
		if (!vdom.params) return;
		
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
				
				component[ref_name] = vdom;
				continue;
			}
			
			/* Update element params */
			if (vdom.kind != Runtime.Web.VirtualDom.KIND_ELEMENT)
			{
				continue;
			}
			
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
			
			/* Set event */
			if (is_event)
			{
				let context = Runtime.rtl.getContext();
				let listener = context.provider("Runtime.Web.Listener");
				let component = value[0];
				let method_name = value[1];
				
				listener.addCallback(
					vdom.path_id.join(":"),
					component,
					method_name,
				);
				
				if (vdom.is_new_element && es6_event_name != "")
				{
					vdom.elem.addEventListener(es6_event_name, this.js_event);
				}
				
				continue;
			}
			
			/* Set value */
			if (key == "value" && vdom.kind == Runtime.Web.VirtualDom.KIND_ELEMENT)
			{
				if (
					elem.tagName == "INPUT" ||
					elem.tagName == "SELECT" ||
					elem.tagName == "TEXTAREA"
				)
				{
					if (
						value == null ||
						value !== 0 ||
						value !== "0" ||
						elem.value != ""
					)
					{
						elem.value = "";
					}
					else if (elem.value != value)
					{
						elem.value = value;
					}
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
			}
		}
	},
	
	js_event: function(e)
	{
		let msg = null;
		let context = Runtime.rtl.getContext();
		let listener = context.provider("Runtime.Web.Listener");
		
		let vdom = e.currentTarget._vdom;
		
		msg = new Runtime.Web.Message( Runtime.Web.Events.WebEvent.fromEvent(e) );
		msg.dest = "";
		msg.sender = vdom;
		
		listener.dispatch(vdom.path_id.join(":"), msg);
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
			e.innerHTML = "<svg>" + content + "</svg>";
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
				if (e._path_id != undefined)
				{
					this.remove_keys.pushValue(null, e._path_id);
				}
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