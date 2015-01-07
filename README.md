# WIP
This importer isn't yet ready for developer use. Here be dragons.

# TIGER import pipeline
A pipeline for importing TIGER data into Pelias.

## usage
Make sure you have an elasticsearch server running at `localhost:9200` and the
[OpenVenues address deduplicator](https://github.com/openvenues/address_deduper) at `localhost:5000`, and then run
`node import.js DIR_NAME`, where `DIR_NAME` is the path to a directory filled with (unzipped) TIGER shapefiles.
