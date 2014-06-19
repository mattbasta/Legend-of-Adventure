package entities

import (
    "os"

    "github.com/robertkrimen/otto"
)


var defaultVM = otto.New()
var defaultVMsetUp = false


type EntityVM struct {
    vm *otto.Otto
}


// TODO: convert this to use channels to prevent race conditions
func GetFreshEntityVM() *EntityVM {

    if !defaultVMsetUp {
        framework, err := os.Open("resources/entities/framework.js")
        if err != nil {
            panic("Could not open entity framework file")
        }
        defer framework.Close()

    }

    return &EntityVM {
        defaultVM.Copy(),
    }
}
