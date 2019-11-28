<?php

set_time_limit(0);
date_default_timezone_set('UTC');

require __DIR__.'/../../Instagram-API/vendor/autoload.php';

$username = $argv[1];
$password = $argv[2];
$maxId = $argv[3];

$debug = true;
$truncatedDebug = false;

$ig = new \InstagramAPI\Instagram($debug, $truncatedDebug);

try {
    $ig->login($username, $password);
} catch (\Exception $e) {
    echo 'Something went wrong: '.$e->getMessage()."\n";
    exit(0);
}

$allPosts = [];
try {
    $more = true;
    $maxId = "";
    do {
        $feed = $ig->timeline->getTimelineFeed($maxId);
        $maxId = $feed->getNextMaxId();
        $more = $feed->getMoreAvailable();
        $allPosts = array_merge($allPosts, $feed->getFeedItems());
        print count($allPosts);
        print $maxId;
    } while ($more && $maxId);
    exit(0);
} catch (\Exception $e) {
    echo "{}";
    exit(1);
}
