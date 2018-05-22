/**
 * LICENSE
 * =======
 * 
 * Copyright 2018 netAirspace.com, LLC
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation 
 * files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, 
 * modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software 
 * is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES 
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE 
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR 
 * IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 * 
 * 
 */
var nasIataIcaoTooltips={

	/**
	 * Initiate highlighting of IATA/ICAO tooltips.
	 * @param cssSelector Specifies the HTML elements to search for IATA/ICAO codes to highlight.
	 * @param {string} ajaxUri The URI to which a GET request is made to get possible tooltip values.
	 * @param {object} overrides Optional parameter. An object containing key-value pairs to override the
	 * 					defaults in nasTooltips. 
	 */
	init: function(cssSelector, ajaxUri, overrides){
		nasTooltips.init(cssSelector, nasIataIcaoTooltips.regex, ajaxUri, overrides);
	},

		
	/**
	 * Matches word break, code, word break. Codes recognised:
	 * 
	 * - IATA operator: 2 characters, of which zero or one (but not both) may be numbers
	 * - IATA airport: 3 letters
	 * - ICAO operator: 3 letters
	 * - ICAO airfield: 4 letters
	 * 
	 * All codes are assumed to be uppercase.
	 */
	regex:/\b[A-Z]{2,4}\b|\b[0-9][A-Z]\b|\b[A-Z][0-9]\b/g
}

var nasTooltips={
		
	/**
	 * Initiate highlighting of tooltips. Sets up any overrides and adds an event listener on DOMContentLoaded to
	 * trigger matching of codes, AJAX lookup, and highlighting of found codes.
	 * @param {string} cssSelector Specifies the HTML elements to search for tooltips to highlight.
	 * @param {RegExp} regex A regular expression defining the possible tooltips (for example, IATA/ICAO codes).
	 * @param {string} ajaxUri The URI to which a GET request is made to get possible tooltip values.
	 * @param {array} overrides Optional parameter. An object containing key-value pairs to override the
	 * 					defaults in nasTooltips. You can override tagsToExclude, wrapperTagClass and tooltipTagId.
	 */
	init: function(cssSelector, regex, ajaxUri, overrides){
		if(!cssSelector || !regex || !ajaxUri){ return false; } //called badly
		if(!XMLHttpRequest || !JSON || !document.querySelectorAll){ return false; } //browser not capable
		nasTooltips.cssSelector=cssSelector;
		nasTooltips.regex=regex;
		nasTooltips.ajaxUri=ajaxUri;
		if(overrides){
			var keys=Object.keys(overrides);
			for(i=0;i<keys.length;i++){
				var k=keys[i];
				nasTooltips[k]=overrides[k];
			}
		}
		if(typeof nasTooltips.renderer==="string"){
			//Look up the function in the renderers
			nasTooltips.renderer=nasTooltips.renderers[nasTooltips.renderer]; 
		}
		if(!nasTooltips.renderer){
			//was either "off" or a non-existent item
			return false;
		}
		document.addEventListener("DOMContentLoaded",  nasTooltips.doHighlight);
	},

	
	/* *******************************************************************************
	 * Default settings for tooltip highlighting. Any of these can be overridden by  *
	 * specifying them in the overrides parameter when calling highlight().          *
	 * ******************************************************************************* */

	/**
	 * The renderer to apply to each tooltip for which a result is found. If overriding this,
	 * you must specify one of the built-in text values in "renderers" below, or supply a 
	 * function whose only parameter is the span around the IATA/ICAO code.
	 */
	renderer:'tooltip',
	
	/**
	 * These tags will be excluded from parsing for matches, even if they appear inside
	 * the elements that should be searched. Modifying the text content of these tags 
	 * may cause errors on your page.
	 */
	tagsToExclude:['script','style','iframe','acronym','abbr','canvas'],

	/**
	 * The CSS class of the element that is wrapped around matched text, and the ID of the tooltip 
	 * that appears when the wrapper element is moused over (if using the default tooltip rendering).
	 * 
	 * Note that we use <span> tags for this because the tags intended for this task are not fit
	 * for our purpose: <acronym> is removed in HTML5, and <abbr> fails to handle multiple possible
	 * matches, as can happen with IATA airline codes, re-used airfield codes (think Hong Kong), etc.
	 * 
	 * Toolitps are assumed to be styled so that they sit above and to the right of the acronym/code that
	 * they explain. Additional CSS classes are applied if they run over the top or right-hand edge, but they
	 * are assumed not to run over the bottom or left-hand edge in their initial state.
	 */
	wrapperTagClass:'nastt_acronym',
	inlineExplanationTagClass:'nastt_explain',
	tooltipTagId:'nastt_tooltip',
	tooltipOffRightEdgeClass:'nastt_offrightedge',
	tooltipOffTopEdgeClass:'nastt_offtopedge',

	/* *******************************************************************************
	 * Supporting functions and properties.                                          *
	 * You don't need to worry about anything below here.                            *
	 * ******************************************************************************* */

	/**
	 * Mapping of built-in rendering options to their functions.
	 */
	renderers:{
		//Default - mouseover tooltips
		'tooltip': function(node){ nasTooltips.renderNodeAsTooltip(node); },
		
		//Append the explanation after the acronym
		'inline': function(node){ nasTooltips.renderNodeAsInline(node); },
		
		//Don't render the tooltips at all
		'off': null
	},
	

	/**************************************************************************************************************
	 * IATA/ICAO CODE TOOLTIP STYLES                                                                            *
	 **************************************************************************************************************/
	defaultAcronymStyle:'position:relative; top:0; border-bottom:1px dotted black; cursor:help;',
	defaultTooltipStyle:'font-family:verdana,arial,helvetica,sans-serif; position:absolute; z-index:99999; left:0; bottom:1.5em; padding:0.5em; white-space:nowrap; background-color:#ffd; color:#333; border:1px solid #333; border-radius:0.5em;',
	defaultTooltipStyleOffRightEdge:'left:auto; right:0;',
	defaultTooltipStyleOffTopEdge:'bottom:auto; top:1.5em',
	possibleMatchClass:'nastt_match',
	
	/**
	 * This object will hold the results found on the server. Each matched result will appear
	 * as an object key, with the object value being an array of one or more possible explanations.
	 * See "Server-side code" in the documentation at the top of this file.
	 */
	results:{},
	
	/**
	 * Strips the HTML tags used to identify possible or actual tooltip matches within the supplied text.
	 * This can be useful with phpBB quoting, where the raw HTML of the tooltip ends up in the post editing box.
	 * @oaram {string} txt The raw text to clean
	 * @return {string} The cleaned text
	 */
	stripTooltipTags:function(txt){
		//Strip inline explanations, in case they were added
		var re1='<span class="'+nasTooltips.inlineExplanationTagClass+'">(.+?)</span>';
		var regex1=new RegExp(re1,'g');
		txt=txt.replace(regex1,'');
		//Then strip the span tags around the IATA/ICAO ode
		var re2='<span class="(?:'+nasTooltips.wrapperTagClass+'|'+nasTooltips.possibleMatchClass+').*?">(.+?)</span>';
		var regex2=new RegExp(re2,'g');
		txt=txt.replace(regex2,'$1');
		return txt;
	},
	
	/**
	 * Initiates highlighting. Finds matches for regex, wraps each in a span tag, and starts the AJAX request
	 * to retrieve definitions.
	 */
	doHighlight:function(){
		if(!nasTooltips.ajaxUri || !nasTooltips.cssSelector){
			//init() has not been called. 
			return false;
		}
		var nodes=document.querySelectorAll(nasTooltips.cssSelector);
		var numNodes=nodes.length;
		for(var i=0;i<numNodes;i++){
			nasTooltips.markPossibleMatches(nodes[i]);
		}
		var possibleMatches=document.querySelectorAll("."+nasTooltips.possibleMatchClass);
		if(!possibleMatches ||0==possibleMatches.length){
			return false;
		}
		var found=[];
		var numPossibleMatches=possibleMatches.length;
		for(var j=0;j<numPossibleMatches;j++){
			var node=possibleMatches[j];
			var code=node.textContent;
                        if(-1==found.indexOf(code) && code.match(nasTooltips.regex)){
                                found.push(code);
                        }
		}
		nasTooltips.getDefinitionsFromServer(found);
	},
	
	/**
	 * Marks possible text matches found within the supplied element.
	 * Possible matches are surrounded with a span whose classname is defined at nasTooltips.possibleMatchClass
	 * @param {HTMLElement} elem The element to search
	 * @return {array} An array of matches. If none are found, returns an empty array.
	 */
	markPossibleMatches: function(elem){
		var textNodes=nasTooltips.getChildTextNodes(elem);
		if(!textNodes || 0==textNodes.length){ return []; }
		var numTextNodes=textNodes.length;
		for(var i=0; i<numTextNodes; i++){
			var txtNode=textNodes[i];
			var oldContent=txtNode.textContent;
			var newContent=oldContent.replace(nasTooltips.regex, '!!nastt!!$&!!nastt!!');
			if(newContent!=oldContent){
				elem.innerHTML=elem.innerHTML.replace(oldContent,newContent);
			}
		}
		elem.innerHTML=elem.innerHTML.replace(/!!nastt!!(.+?)!!nastt!!/g,'<span class="'+nasTooltips.possibleMatchClass+'">$1</span>');
	},
	
	/**
	 * Initiates an AJAX request to look up the found matches
	 * @param {array} found An array of strings found matching the search conditions
	 */
	getDefinitionsFromServer: function(found){
		var xhr=new XMLHttpRequest();
		xhr.onreadystatechange=function(){
			if(XMLHttpRequest.DONE==xhr.readyState){
				if(200==xhr.status){
					nasTooltips.handleResponse(xhr.responseText);
				} else {
					//Something went wrong. Just eat it, leave the user's page alone.
				}
			}
		};
		xhr.open('GET', nasTooltips.ajaxUri+'?codes='+found.join(','), true);
		xhr.send();
	},
	
	/**
	 * Handles the AJAX response from the server, including some basic error checking.
	 * @param {string} responseText The response from the server.
	 */
	handleResponse:function(responseText){
		var matches=JSON.parse(responseText);
		if(!matches || matches.error){ 
			//just eat it, leave the user's page alone
			return false;
		}
		nasTooltips.results=matches;
		nasTooltips.highlightFoundCodes();
	},

	/**
	 * For each previously-found acronym span for which a definition was found,
	 * applies the acronym CSS class and attaching the events.
	 */
	highlightFoundCodes:function(){
		nasTooltips.renderedAsTooltips=false;
		var nodes=document.querySelectorAll("."+nasTooltips.possibleMatchClass);
		for(i=0;i<nodes.length;i++){
			var node=nodes[i];
			var content=node.textContent;
			if(nasTooltips.results[content]){
				nasTooltips.renderer(node);
			}
			if(nasTooltips.renderedAsTooltips){
				window.setTimeout(nasTooltips.applyDefaultStylesIfNeeded, 50);
			}
		}
	},
	
	renderNodeAsTooltip:function(node){
		node.className=nasTooltips.wrapperTagClass;
		node.onmouseover=nasTooltips.showCodeTooltip;
		node.ontouchstart=nasTooltips.showCodeTooltip;
		node.onmouseout=nasTooltips.hideCodeTooltip;
		node.ontouchend=nasTooltips.hideCodeTooltip;
		nasTooltips.renderedAsTooltips=true;
	},

	/**
	 * Renders the IATA/ICAO code as inline text, e.g., "F9 (Frontier Airlines - United States)".
	 * Multiple matches are separated within the parentheses by semicolons.
	 */
	renderNodeAsInline:function(node){
		var key=node.innerHTML;
		var values=nasTooltips.results[key];
		if(!values || 0==values.length){ return false; }
		var explanation="";
		if("string"===typeof values[0]){
			explanation+=" ("+values.join("; ")+")";
		} else {
			var parts=new Array();
			for(var i=0; i<values.length; i++){
				var val=values[i];
				if(!val.name || !val.country){ continue; }
				parts.push(val.name+", "+val.country);
			}
			if(0!=parts.length){
				explanation+=' ('+parts.join("; ")+')';
			}
			node.innerHTML+='<span class="'+nasTooltips.inlineExplanationTagClass+'">'+explanation+'</span>';
		}

	},
	
	/**
	 * Shows the tooltip explaining the moused-over acronym.
	 * @param {Event} event The triggering mouseover/touchstart event
	 */
	showCodeTooltip:function(evt){
		var span=evt.target;
		var key=span.innerHTML;
		var values=nasTooltips.results[key];
		if(!values || 0==values.length){ return false; }
		if(document.getElementById(nasTooltips.tooltipTagId)){
			document.getElementById(nasTooltips.tooltipTagId).remove();
		}
		var tooltip=document.createElement("span");
		tooltip.style.whitespace="pre";
		tooltip.id=nasTooltips.tooltipTagId;
		if("string"===typeof values[0]){
			tooltip.innerHTML=values.join("<br/>");
		} else {
			var parts=new Array();
			for(var i=0; i<values.length; i++){
				var val=values[i];
				if(!val.name || !val.country){ continue; }
				var extraClasses='';
				if(val.kind){ extraClasses+=' nastt_kind_'+val.kind; }
				if(undefined!==val.isCurrent){ 
					if(1==1*(val.isCurrent)){
						extraClasses+=' nastt_current_yes';
					} else {
						extraClasses+=' nastt_current_no'; 
					}
				}
				if(""!=extraClasses){ extraClasses=' class="'+extraClasses.trim()+'"'; }
				parts.push('<span'+extraClasses+'>'+val.name+" ("+val.country+")</span>");
			}
			tooltip.innerHTML=parts.join("<br/>");
		}
		span.appendChild(tooltip);
		nasTooltips.forceTooltipIntoWindow();
	},
	
	/**
	 * Ensures that the tooltip does not run off the top or right-hand edge of the screen.
	 */
	forceTooltipIntoWindow:function(){
		var tt=document.getElementById(nasTooltips.tooltipTagId);
		if(!tt){ return; }
		var box=tt.getBoundingClientRect();
		var displayWidth = document.documentElement.clientWidth;
		if(box.top<0){ tt.style.top=tt.className=tt.className+" nastt_offtopedge"; }
		if(box.right>displayWidth){ tt.className=tt.className+" nastt_offrightedge"; }
	},
	
	/**
	 * Hides the tooltip by removing the element.
	 * @param {Event} event The triggering mouseout/touchend event
	 */
	hideCodeTooltip:function(evt){
		var span=evt.target;
		if(document.getElementById(nasTooltips.tooltipTagId)){
			document.getElementById(nasTooltips.tooltipTagId).remove();
		}
	},
	
	/**
	 * Recursively searches the DOM structure of the given node and returns an array of text nodes, excluding those
	 * contained in elements whose tagName occurs in the tagsToExclude array.
	 * @param elem a DOM element such as a div
	 * @return An array of textNode objects. If none are found, an empty array is returned.
	 */
	getChildTextNodes:function(elem){
		var found=[];
		if(!elem.hasChildNodes()){ return found; }
		var children=elem.childNodes;
        var numChildren=children.length;
        for(var i=0;i<numChildren;i++){
			var child=children[i];
			if(child.tagName && nasTooltips.tagsToExclude.indexOf(child.tagName.toLowerCase())>=0){
				//ignore
			} else if(Node.TEXT_NODE===child.nodeType){
				found.push(child);
			} else if(Node.ELEMENT_NODE===child.nodeType){
				found=found.concat(nasTooltips.getChildTextNodes(child));
			}
		}
		return found;
	},
	

	/**
	 * Checks for the existence of the supplied CSS selector in all included stylesheets.
	 * @return true if the CSS selector is found in at least one stylesheet, otherwise false.
	 */
	selectorHasStyle:function(selector){
	    for(var i=0; i<document.styleSheets.length; i++){
		    var styleSheet = document.styleSheets[i];
		    var cssRules=styleSheet.rules ? styleSheet.rules : styleSheet.cssRules;
		    for (var j=0; j<cssRules.length; ++j) {
		        if(cssRules[j].selectorText==selector) return true;
		    }
	    }
	    return false;
	},
	
	/**
	 * If the acronym and tooltip elements are not styled, adds a new stylesheet with the default styles.
	 * @see defaultAcronymStyle
	 * @see defaultTooltipStyle
	 */
	applyDefaultStylesIfNeeded:function(){
		var acronymSelector='.'+nasTooltips.wrapperTagClass;
		var tooltipSelector='#'+nasTooltips.tooltipTagId;
		var topEdgeSelector='.'+nasTooltips.tooltipOffTopEdgeClass;
		var rightEdgeSelector='.'+nasTooltips.tooltipOffLeftEdgeClass;
		var stylesheetContent='';
		if(!nasTooltips.selectorHasStyle(acronymSelector) && !nasTooltips.selectorHasStyle("span"+acronymSelector)){
			stylesheetContent+="span"+acronymSelector+" { "+ nasTooltips.defaultAcronymStyle +" }\n";
		}
		if(!nasTooltips.selectorHasStyle(tooltipSelector) && !nasTooltips.selectorHasStyle("span"+tooltipSelector)){
			stylesheetContent+="span"+tooltipSelector+" { "+ nasTooltips.defaultTooltipStyle +" }\n";
		}
		if(!nasTooltips.selectorHasStyle(topEdgeSelector) && !nasTooltips.selectorHasStyle("span"+topEdgeSelector)){
			stylesheetContent+="span"+tooltipSelector+"."+nasTooltips.tooltipOffTopEdgeClass+"{ "+ nasTooltips.defaultTooltipStyleOffTopEdge +" }\n";
		}
		if(!nasTooltips.selectorHasStyle(rightEdgeSelector) && !nasTooltips.selectorHasStyle("span"+rightEdgeSelector)){
			stylesheetContent+="span"+tooltipSelector+"."+nasTooltips.tooltipOffRightEdgeClass+"{ "+ nasTooltips.defaultTooltipStyleOffRightEdge +" }\n";
		}
		if(""!=stylesheetContent){
			var sheet=document.createElement("style");
			sheet.innerHTML=stylesheetContent;
			document.body.appendChild(sheet);
		}
	},
	
}
