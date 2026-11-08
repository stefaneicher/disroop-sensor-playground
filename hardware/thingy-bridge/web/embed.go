// Package web embeds the dashboard (hardware/thingy-bridge/web/static, owned by the web agent).
package web

import (
	"embed"
	"io/fs"
)

//go:embed static
var files embed.FS

// Static returns the dashboard files with static/ as root.
func Static() fs.FS {
	sub, err := fs.Sub(files, "static")
	if err != nil {
		panic(err)
	}
	return sub
}
