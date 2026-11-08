// Package tennisapp embeds the Tennis and Ski games (games/). `./project games build` copies the
// built app into dist/ (gitignored, except .keep); without it /tennis/ shows a build hint.
package tennisapp

import (
	"embed"
	"io/fs"
)

//go:embed all:dist
var files embed.FS

// Static returns the game files with dist/ as root.
func Static() fs.FS {
	sub, err := fs.Sub(files, "dist")
	if err != nil {
		panic(err)
	}
	return sub
}
