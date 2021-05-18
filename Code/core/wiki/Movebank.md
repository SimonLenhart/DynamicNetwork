# Data from Movebank

To access data directly from [Movebank](https://www.movebank.org/), Teamwise
uses the interface provided by the
[`move` package](https://CRAN.R-project.org/package=move).
Therefore it is necessary to have an R server running that Teamwise can connect
to, using the [OpenCPU](https://www.opencpu.org/) API.

## Data Structures

Within Teamwise, Movebank data is organised in and downloaded using the
following classes, defined in `movebank/movebank.js`.

### `Movebank`

This is the central access point to Movebank. It offers methods to log into and
out of Movebank and holds the list of available studies. By logging in, the
individual (as studies hold account dependent meta information) list of
available studies is automatically downloaded, to be displayed in the menu.

### `MovebankStudy`

This class holds meta information about a single study stored in Movebank, such
as id, name, description and license terms. It is also used to download and
save the list of animals that are associated with this study, as well as tag
deployment information and a reference to the actual movement data of the
individual animals.

Most importantly, this class provides the method to create a data source
containing the given list of animals to be added to the collection of loaded
data sets.

### `Animal`

This is a wrapper class that holds information about an individual as stored in
Movebank, such as id, name, sex, birthdate and taxon.

Note that the availability of these fields depends on the actual values that are
stored in Movebank and can differ from one animal to another. Only the animal's
id is needed and required by Teamwise. However, at least the name (refered to as
`local_individual_identifier`) is apparently set for most individuals.

### `Deployment`

This class contains information about the deployment of tags to an individual in
a study, such as the attachment type of the tag, the location and timestamp of
start and end of the deployment, as well as information about the animal that
would change over time, such as mass or lifestage.

Currently, this class is not used inside Teamwise yet.

## Data Processing

The classes `MovebankStudy`, `Animal` and `Deployment` are basically created for
every row from their respective tables (i.e. data frames) which are received by
the R server, using the functions from the `move` package. The properties of
these classes are set accordingly to the data frame columns, exept for all
"location" properties, which are already given as Cesium coordinates.

Although Movebank provides an
[Attribute Dictionary](https://www.movebank.org/node/2381), the listed attribute
names do not conform with the ones actually received using R. The supplied
descriptions are nevertheless used inside Teamwise where possible.

An animal's movement data is downloaded in the form of a `Move` object inside R,
a data type containing multiple vectors and tables, some of which being
redundant (e.g. timestamps or coordinates) or already loaded (e.g. animal or study
related) data. 

As the `move` package provides functions to calculate on these objects, it is
necessary to keep the references to them inside Teamwise. This is what is
returned (and cached in the `_animalData` property of a `MovebankStudy`, mapping
animal ids to the outcome of the download) when calling `getMoveObj`. 

The actually used information is the slot `@data`, holding a data frame of the
sensor information for every recorded timestamp. Due to R lacking a builtin
conversion to convert proprietary S4 classes to JSON, the data must be
extracted in a subsequent request, which is done automatically in the `getData`
method.
