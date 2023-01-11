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
		
	},
	
	
	/**
	 * Add changed virtual dom
	 */
	addChangedElem: function(vdom)
	{
		this.render_elem_list.pushValue(vdom);
	},
	
	
	/**
	 * Repaint virtual DOM
	 */
	repaintVirtualDom: function(vdom)
	{
		this.render_vdom_list.pushValue(vdom);
	},
	
	
	/**
	 * Repaint virtual DOM reference
	 */
	repaintRef: function(vdom)
	{
		this.render_vdom_list.pushValue(vdom);
	},
	
	
	/**
	 * Call render virtual dom
	 */
	render: function()
	{
		let sz = this.render_vdom_list.count();
		for (let i=0; i<sz; i++)
		{
			let vdom = this.render_vdom_list[i];
			if (vdom.render)
			{
				vdom.render(vdom);
			}
		}
	},
	
	
	/**
	 * Animation frame
	 */
	animationFrame: function()
	{
		let sz = this.render_elem_list.count();
		for (let i=0; i<sz; i++)
		{
			let vdom = this.render_elem_list[i];
			this.updateElem(vdom);
		}
	},
	
	
	/**
	 * Update element in animation frame
	 */
	updateElem: function(vdom)
	{
		if (vdom.kind == Runtime.Web.VirtualDom.KIND_ELEMENT)
		{
			if (vdom.instance == null)
			{
				vdom.instance = this.constructor.createElem(vdom.name, vdom.content);
				vdom.instance._vdom = vdom;
			}
			
			this.updateElemParams(vdom);
		}
		
		else if (vdom.kind == Runtime.Web.VirtualDom.KIND_TEXT)
		{
			/* Create instance */
			if (vdom.instance == null)
			{
				vdom.instance = document.createTextNode(
					Runtime.rtl.exists(vdom.content) ? vdom.content : ""
				);
				vdom.instance._vdom = vdom;
			}
			else
			{
				/* Set new text */
				if (vdom.instance.nodeValue != vdom.content)
				{
					vdom.instance.nodeValue = vdom.content;
				}
			}
		}
		
		else if (vdom.kind == Runtime.Web.VirtualDom.KIND_RAW)
		{
			vdom.instance = this.constructor.rawHtml(vdom.content);
		}
	},
	
	
	/**
	 * Update element params
	 */
	updateElemParams: function(vdom)
	{
		let elem = vdom.instance;
		let keys = vdom.params.keys();
		for (let i=0; i<keys.count(); i++)
		{
			let key = keys[i];
			let value = vdom.params[key];
			
			let is_event = false;
			let event_class_name = "";
			if (key.substr(0, 7) == "@event:")
			{
				is_event = true;
				event_class_name = key.substr(key, 7);
			}
			
			/* Set event */
			if (is_event)
			{
			}
			
			/* Set reference */
			if (key == "@ref" || key == "@name")
			{
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
		var res = new Vector();
		var e = document.createElement('div');
		e.innerHTML = Runtime.rtl.trim(content)
		for (var i = 0; i < e.childNodes.length; i++) res.pushValue( e.childNodes[i] );
		return res.toCollection();
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