# Items

Items are inherited from a [base item class](https://github.com/endquote/laundry/blob/master/item.js) and are the generic data format that is passed between [washers](https://github.com/endquote/laundry/blob/master/washers/README.md). Input washers generate items and output washers consume them. 

Items have basic properties that describe them which are declared in their constructor, and should have default values. These defaults are inspected by output washers that need to know about their types, such as MySQL. 

```javascript
Items.Sample = function(config) {
    this.title = ''; // text-only short string
    this.caption = ''; // text-only longer string
    this.description = ''; // formatted longer string
    this.url = '';
    this.date = moment();
    this.author = '';
    this.tags = [];
    this.mediaUrl = ''; // media to include in enclosure
    this.mediaBytes = 0; // size of enclosure
    this.imageUrl = ''; // a single image representing the post

	// A primary key prevents multiple instances of the same
	// item from being entered into a database.
	this._primaryKey = 'url';

    Item.call(this, config);
    this.className = Helpers.buildClassName(__filename);
};

```

The `downloadLogic` method on an item returns a mapping of keys to methods which download any files related to the item, typically by calling `Storage.downloadUrl`. [More on storage](https://github.com/endquote/laundry/blob/master/storage/README.md).

```javascript

/*
Defines logic for downloading any files associated with this item.
* prefix: The directory at which the download will end up. Add a filename to this.
* obj: The API response from the washer which represents the item.
* cache: Information about already downloaded files -- just pass on to Storage.downloadUrl.
* download: Whether or not to actually perform the download -- just pass on to Storage.downloadUrl.
*/
Items.Sample.downloadLogic = function(prefix, obj, washer, cache, download) {
    return {
        image: function(callback) {
            var target = prefix + '/' + obj.id + '.jpg';
            Storage.downloadUrl(washer.job.log, obj.image_url, target, new Date(), cache, false, download, callback);
        },
        video: function(callback) {
            var target = prefix + '/' + obj.id + '.mp4';
            Storage.downloadUrl(washer.job.log, obj.video_url, target, new Date(), cache, false, download, callback);
        }
    };
};
```

Item classes should have a static `factory` method which accepts an API response from the washer, and an object describing any downloaded files. This method should parse the API response into a useful format and call the actual Item constructor.

```javascript
Items.Sample.factory = function(post, downloads) {
    var item = new Items.Sample({
    	title: post.title,
    	description: post.description,
        date: moment.unix(post.created_time),
        url: post.link
    });

    item.description += util.format('<p><a href="%s"><img src="%s" width="640" height="640"/></a></p>', item.url, downloads.image.newUrl);

    return item;
};
```
