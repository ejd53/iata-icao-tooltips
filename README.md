# netAirspace.com IATA/ICAO code tooltips

This Javascript code lets you highlight IATA/ICAO codes on your site and show what they mean. By default, this is done by means of mouseover tooltips (which also work with mobile touch events), but you can choose to present the codes in another way.

In addition to the client-side Javascript provided, you will need either to write or to have access to a server-side script, which looks up the codes and returns their definitions in the required format.

A function is provided to clean all tags inserted by this script from a given piece of text. If using this script on a phpBB forum, you may need to use this to prevent issues when quoting posts containing IATA/ICAO codes.

The code is written in "pure" Javascript, so no additional frameworks or libraries (like jQuery) are needed.


## Contents

- Client-side script - how to include and call the IATA/ICAO Javascript
- Server-side script - Requirements for the server-side script supplying the code definitions, and some options
- CSS styles for tooltip rendering - how to change the look of the default tooltips
- Integration with phpBB - issues you may encounter, and how to fix them


## Client-side script

Copy nasIataIcaoTooltips.js to your server, include it in the page header, then call the init function like this:

`nasIataIcaoTooltips.init("div.post", "/path/to/scriptToGetCodes.php");`

`init()` will wait for page load before firing the code lookup, so you don't need to wrap it in an onload handler; just call it.

The first parameter is a CSS selector identifying the element(s) to parse for IATA/ICAO codes.

The second parameter is the path to a script (for example PHP) which can look up IATA/ICAO codes and return the results in the 
correct format (see "Server-side script" below).

You can provide an optional third parameter, an object overriding the default CSS class names, etc. You can override pretty much anything in the nasTooltips object, including functions, but you probably shouldn't.

You can change how found codes are handled, by specifying "renderer" in this overrides object. The value should be one of:

- "tooltip" - the default behaviour. Applies mouseover tooltips. The codes and the tooltips will have a (reasonable) default style unless matching CSS rules are found; note that any matching CSS rules REPLACE, not ADD TO, the default styles.

- "inline" - inserts the airline/airport descriptions after the code, like "F9 (Frontier Airlines - United States)". The precise formatting will depend on the server-side script that returns the descriptions. Note that, if your server-side script can return multiple matches for a given code, this option is likely to become unreadable.

- "off" - disables tooltips altogether. This option exists mainly so that you can implement per-user configuration. Be aware that if this option is specified, the codes are not requested from the server. If you implement additional functionality that depends upon the results being present, you should ensure that "off" cannot be specified.

- a custom function, taking only the wrapper element around the IATA/ICAO code as a parameter.


## Server-side script
 
Your server-side script must accept a GET request with the IATA/ICAO codes in a comma-separated list: 

?codes=GF,US,HEL,EGLL 

and respond with a JSON object containing a key-value pair for each matched code; unmatched codes must not be returned. The value of each key is an array of one or more matches; order of the keys is unimportant, but multiple values for a given key will be rendered in the order in which they appear:
```
{
		"GF":[
			{ "name":"Gulf Air", "country":"Bahrain" }
		],
		"US":[
			{ "name":"US Airways", "country":"United States" },
			{ "name":"US Airways Express", "country":"United States" },
			{ "name":"US Airways Shuttle", "country":"United States" }
		],
		"HEL":[
			{ "name":"Helsinki - Vantaa", "country":"Finland" }
		],
		"EGLL":[
			{ "name":"London - Heathrow", "country":"United Kingdom" }
		]
}
```
This structure is preferred, as it is easier to change the presentation. (The built-in renderers present name and country slightly differently between the tooltip and inline renderers, for example.) It is also easier to extend this if you want to. 

Your server-side script will need to set the correct MIME type. For PHP, `header('Content-Type: application/json');` at the top of your script will do this.

The built-in tooltip renderer recognises two additional properties "kind" and "isCurrent", in addition to the basic "name" and 
"country". Where these properties are present, they result in the <span> elements around each match in the tooltip having 
additional CSS classes applied:

* `kind`: The span will have the CSS class `nastt_kind_$KIND`. This lets you style, for example, operator and airfield matches differently within the tooltip (perhaps applying an icon as a background image).
* `isCurrent`: The span will have either the `nastt_current_yes` or `nastt_current_no` CSS class. Operator and even airfield codes can be re-used - and in the case of IATA airline codes, may even be shared by two current but geographically-separated operators. Acceptable values are true/false, 1/0, "1","0".

The client-side code can also accept responses with pre-formatted strings:
```
{
		"GF":["Gulf Air (Bahrain)"],
		"US":["US Airways (United States)","US Airways Express (United States)","US Airways Shuttle (United States)"],
		"HEL":["Helsinki - Vantaa (Finland)"],
		"EGLL":["London - Heathrow (United Kingdom)"]
}
```
You cannot mix objects and pre-formatted strings; pick one and stick with it.

Your server-side script should take precautions against XSS if there is any possibility whatsoever that untrusted data may be returned.


## CSS styles for tooltip rendering

This is only relevant if you (or your users, if you offer them the choice) choose to use the built-in tooltip renderer.

If you do not style the found IATA/ICAO codes or the tooltips, this script will apply default styles: The codes will
have a dotted underline and a help cursor, and the found values will appear in a light yellow box. Unless you overrode
the CSS class/IDs when calling init(), these are the CSS rules in question:

* `span.nastt_acronym` - IATA/ICAO codes for which a definition has been found
* `span#nastt_tooltip` - The tooltip that appears when the mouse cursor is over the code
* `span.nastt_offtopedge` - Tooltip ran off the top of the window, this forces it to appear below the acronym/code.
* `span.nastt_offrightedge` - Tooltip ran off the right of the window, this forces it to appear left of the acronym/code. 

You can override some or all of these style rules simply by specifying them in your existing stylesheet; the default styles
are inserted only if no matching rule is found. Note that any matching CSS rules REPLACE, not ADD TO, the default styles.


## Integration with phpBB

If using this script on a phpBB forum, you may encounter issues with quoting posts where IATA/ICAO codes have been highlighted. You may find that the raw HTML of the tooltip appears within the quoted text. You can try using the included stripTooltipTags function to clean it up.

In netAirspace's phpBB, we did the following, however note that you modify phpBB at your own risk:
 
    OPEN:
    editor.js, within the relevant forum skin
 
    FIND:
    insert_text('[quote="' + username + '"]' + theSelection + '[/quote]');

    REPLACE WITH:
    if(nasTooltips){ theSelection=nasTooltips.stripTooltipTags(theSelection); }
    insert_text('[quote="' + username + '"]' + theSelection + '[/quote]');

Your phpBB installation may vary. The intent is to call the stripTooltipTags function immediately before inserting the text into the posting box, after all other processing is complete.
 
Another workaround is to disable the IATA/ICAO code highlighting on the post/PM compose pages, but if you have "quick reply" or similar mods, that may not be an option for you.

If you modify editor.js, you will need a way to force your visitors' browsers to load the new version. If you don't have another 
mechanism in place, you could try adding a timestamp or similar to its URL when including it in the page, for example:
```
OLD: <script type="text/javascript" src="editor.js"><script>
NEW: <script type="text/javascript" src="editor.js?t=20180501_235900"><script>
```
