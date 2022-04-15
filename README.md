# sn-magazine

concepts:
1. context layout content + widget children contents 
2. context data content + global layout content by type name + widget children contents
3. context layout content + react component by context type when widget content is not defined ???
4. context content + local (This) layout + widgets
5. predefined layout when page and widget contents completely missing from sensenet repo

Boxes resolved by
- selected by type of widget content (e.g. auto-widgetContentTypeName.js)
- selected by setting of widget content (e.g. manual-WidgetClientComponentFieldValue.js)
- selected by type of context when widget is not defined (e.g auto-contextContentTypeName.js)
- selected by default setting (e.g. auto-default.js)

layout = formerly known as page content
widget = formerly known as pagecomponent or portlet