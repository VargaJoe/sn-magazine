# sn-magazine

Layout and widget driven webapp concept for sensenet as a service (snaas) in react. Build and develop webpages easily with sensenet repository contents. 

The following concepts are covered to generate webapp layout by:
- predefined layout when page and widget contents completely missing from sensenet repo
- sensenet repository context layout content and its widget children contents 
- sensenet repository context layout content and react component by context type when widget content is not defined 
- sensenet repository context data content and a global layout content by context type name and widget children contents
- sensenet repository context data content and local (This) layout with widget children contents

# Prerequisites

When you register a snaas repository, you will get a sample workspace content structure. You can manage sensenet contents through  sensenet [admin ui](https://admin.sensenet.com). The sample workspace is set to be private by default, so you will have to make it public to try this app with your repository. I recommend to set `See` permission on your Content (Globe icon) and `Read` permission (or with `Make Content Public` action).

Now you can set your repository with this app. Clone this github repository and set `config.json` to your sensenet repository:
- apiUrl is your snaas repo url
- dataPath is the entry point of the webapp, in this example we will go with `SampleWorkspace`

The other settings are not relevant for now, just go and set `apiUrl` first, it is enough to try out this app. 
Your settings will look something like this:
```json
{
	"apiUrl" : 				"https://sn12345678.sensenet.cloud",
	"dataPath" :			"/Root/Content/SampleWorkspace",
	"pagecontainerPath": 	"/Root/Content/(layout)",
	"layoutType": 			"Layout",
	"widgetType": 			"Widget",
	"autoLayout": {
		"default": 			"wide",
		"folder" :			"explore",
		"content" : 		"wide",
		"isFolder" :		"explore",
		"notFolder" : 		"wide"
	}
} 
```

# Predefined Layout

When you've got your snaas repository, set permission and apiUrl as mentioned before, you can start the app.
Before first start you will have to install yarn:
```powershell
yarn install
```

Every other occasion you just start the app:
```powershell
yarn start
```

The webapp will start in your browser and will show a simple webpage with two columns with menu on the left and breadcrumb and content view on the wider right pane. As you just have your sensenet repository it does not have layout and widget "system" installed on it. In this case the predefined concept is triggered in the app. You've seen this section in app.config:
```json
"autoLayout": {
		"default": 			"wide",
		"folder" :			"explore",
		"content" : 		"wide",
		"isFolder" :		"explore",
		"notFolder" : 		"wide"
	}
```

It means, when no layout and widget contents are found in sensenet repository these settings are used. But first you will have to understand sensenet context concept. When navigating sensenet repository with this app sensenet contents are loaded by web url path. It means when you see the url:
`http://localhost:3000/Document_Library/books` 
the app resolve this as:
your sensenet repository + dataPath + url path

Ok, maybe this is still difficult to understand yet, so just log in to your sensenet repository with `admin ui`, and click on the Globe icon. That is your playing ground and it has the system path `/Root/Content`. With default install you've got a sample workspace and it has the same name as we set in app.config, now it is clear, why the value is `/Root/Content/SampleWorkspace`.
That is our app entry point. The above web example has `/Document_Library/books` url path. Now bring it all together, the app context will be: `/Root/Content/SampleWorkspace/Document_Library/books` content in your sensenet repository

In this example the sensenet content with the name `books` has a content type `Folder`. In the above exmaple settings `autoLayout` has a value for `folder` property. It says `explore`. It means the app will try to resolve the `page-explore` react component under `layouts` folder with this context. It the context content type does not have a settings like this the app will try to identify if the context content is a folder or not and your react component accordingly in the same way as with previous example. If `isFolder` and `notFolder` settings are not in place the app will use`default` value as fallback.

Layouts are the first layer of the visualization. Layouts are like pagetemplates if you are familiar with previous versions of sensenet or similar content management systems. The second layer is widgets (or portlets, again with previous sensenet terminology). You can set "boxes", aka widgets on the layout in widget zones. With predefined layout logic it means they are hardcoded in the layout as `page-explore` as sample:
```jsx
<MenuList data={props.data} page={props.page} widget={{
              ContextBinding: [ "currentcontext" ],
              ContentQuery: ".SORT:Name",
              ChildrenLevel: [ "child" ]
            }}/>
```
Notice as work parameters are set in the react component itself. These settings are manage directly what data will be displayed on the page. The two sample layout, `page-explore` and `page-wide` are coded as sensenet repository tree could be walked up and down.

There is a third layer of visualization and it is the content itself. Sample widget components are capable to identify context content type, and sample layouts are coded to notice if no widget is set in content zone and load this third layer instead accordingly. 

For example there is an `auto-workspace` component under `/components/content` folder, so when `http://localhost:3000/` url is opened in the browser, the app identify the context content is `/Root/Content/SampleWorkspace` as no url path is given and the entry point of the app is this sensent repository path. The app request the content from the sensenet repository and finds out `SampleWorkspace` content type is `Workspace`. Now as the sensenet repository does not have `Layout` and `Widget` contents it will use `autoLayout` settings and identify react component for the context as `explore` (Workspace is a folder type) and load `page-workspace` react component. In this component at `content` zone the app tries to load widgets, but as predefined mode does not use `layouts` and `widgets` it will try to load `auto-workspace` react component from under `/components/content` instead. As the react component exists the layout will use that logic. If the react component was missing, `auto-default` react component would be used instead. You will find out the difference as the other types are missing for educational purpose.

It's the simplest configuration, so you can experiment right away at this point.

# sensenet repository data context with layout

A bit more complicated settings when you start to use layout and widget contents with your sensenet repository but far more flexible and make webpage building much more quicker. For this concept you will have to install content type definitions for layout and widgets. You will find sample CTDs under `/ctd` folder in this app. First you will have to install `LayoutCtd` and `1WidgetCtd`, the other widget types have to be installed afterwards as they are descended from `Widget` type. 
Note: don't be bothered by the number in Widget file name, it is a workaround for those who are using import tool with alphabetical ordering

When content types are in place in the sensenet repository, these app.settings row make sense:

```json
{
	"pagecontainerPath": 	"/Root/Content/(layout)",
	"layoutType": 			"Layout",
	"widgetType": 			"Widget",
} 
```

Layout and widget types are the two master types. While page container path is the main container path where we put our layout contents. I will explain it later, but if you are familiar with previous sensenet versions, it is like appmodell with portletpage contents. It is important that visitors have read permission on layout container. PagecontainerPath may be obsolate at this point as ancestor paths resolve logic works. It means you can put your layout content anywhere under ancestors layout folder.

Now layout container folder is called `(layout)`. This name is hardcoded at this point, may be configurable later. You can create a `(layout)` folder anywhere under from the context content path to under any ancestors that has visitor read permission for the app to be able to requested. For example create it under sample workspace as `/Root/Content/SampleWorkspace/(layout)`. I suggest to use `SystemFolder` as content type for this folder to use any ctd, along with `Layout` and `Widget`. In other case you will have to ensure your custom container type has these as allowed child types to be created. 

When you've created `(layout)`, you can create a `Layout` type content for any content type in your sensenet repository you want to add custom layout in your app. For example if you want to build a custom page for your workspace root page, you will have to create a `Layout` type content with the name `Workspace`. When you create the content, you can add the layout component name with the same logic as we used with autoLayout. The field you have to set is `PageTemplate` (old sensenet terminology, may be changed later). If the field value is `vanilla` the app will use `page-vanilla` component as mentioned before.

As I mentioned at predefined layout section, Layout is only the first layer. It will use the so called layout (or pagetemplate) with predefined widget (or portlet) zones. Now you will have to add widgets to these zones. `Explore` layout has hardcoded widgets but other layouts (e.g. vanilla) may/should be managed from widget contents. For this you will have to add a widget content under the previously created layout content. 

For example create a `WidgetContentCollection` at under `/Root/Content/SampleWorkspace/(layout)/Workspace`. You can name it anyhow, it wont be used by the app. I recommend to name it for you to easily identify what you use it for (e.g. Leftmenu, Breadcrumb, etc). Widgets have multiple fields to manage how will work in the app. They are planned to work full automatically. For example content collection has the following settings:
- Title: react components may use this field to show predefined static widget title different from context content
- Context binding: sensenet repository context is defined by the url path by default, but in widgets with context binding field it can be changed to that specific box, it won't affect the other area of the layout (context binding, children level, context path, relative path should be explained in more detail)
- ContentQuery: lucene query to be used for the widget to request more data from sensenet repository
- Expand: comma separated list of reference field names to be expaned in odata response for the react component
- ChildComponent: react component name, if empty widget view will be resolved from under `/components/widget` folder with `auto-` prefix, e.g. `auto-widgetcontentcollection` component will be used for a content collection widget by default; if the field is set react component will be resolved with `manual-` prefix accordingly.
- PortletZone: in which zone of the layout should the widget be displayed (if the zone does not exists, the widget won't be shown)
- Hidden: it is a basic sensenet field, but useful to know if it is true, the widget won't be shown, it's an easy way to disable a widget

Widget fields can be varied and the above sample of content collection is only to demonstrate the possibilites.

The third layer as mentioned earlier is the content itself. Sample content collection view is coded with the ability to identify child type and load child item view by its type:
```jsx
    {bindedContext.children?.map((child) => { 
    return addComponent('content', 'auto', child.Type.toLowerCase(), `${counter++}-${context.Id}-${child.Id}`, child, props.page, child); 
    })}
```

This means in this example every child item will use it's own display mechanism, resolved by the react component under `/components/content/` with `auto-`prefix and the content type name. For example content collection with memolist context will display the box with `/components/widgets/auto-widgetcontentcollection` react component, which will show its children items with `/components/content/auto-memo` react component. 

So widgets (boxes) resolved by
- selected by type of widget content (e.g. auto-widgetContentTypeName.js)
- selected by setting of widget content (e.g. manual-WidgetClientComponentFieldValue.js)
- selected by type of context when widget is not defined (e.g auto-contextContentTypeName.js)
- selected by default setting (e.g. auto-default.js)

# sensenet repository layout context 

There is a special way to use layout. It can be created directly at context path.
When you create a `Layout` content on a context path, the app will use it as data and layout instead of search for an other Layout content under `(layout)` container. For example create a `Layout` type content with the name `Static page` under `SampleWorkspace`. Set pagetemplate field and create widgets as mentioned earlier. Now if you browse the page `http://localhost:3000/Static page`, it will resolve directly from these contents. If you need custom layouts per pages, you can build your site this way faster instead of define different types and layouts with a container.

# This layout

There is a special layout name for in case you have to override layout of a specific type at certain context paths. Use the name `This` under `(layout)` instead of the context content type. The app will use this layout on that context even so layout with the context type name is exists. For example if you have a `/Root/Content/SampleWorkspace/Memolist/(layout)/This` layout content, then it will be used when you browse `http://localhost:3000/Memolist` even if you have `/Root/Content/SampleWorkspace/(layout)/Memolist` layout defined. `This` content has priority on resolve layouts.

# Note:
- layout = formerly known as page content
- widget = formerly known as pagecomponent or portlet