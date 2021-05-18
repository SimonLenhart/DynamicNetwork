# Check whether a package is installed and install if not, then load it.
requireOrInstall <- function(package) {
    if (!require(package, character.only = TRUE)) {
        install.packages(package)
        library(package, character.only = TRUE)
    }
}

# (Install and) load the specified packages
packages <- c("opencpu", "move")
invisible(sapply(packages, requireOrInstall))

#start the R server, default port is 5656
ocpu_start_server(preload = packages)
