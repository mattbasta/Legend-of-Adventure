package entities

import (
    "io/ioutil"
    "log"
    "strings"

    "github.com/robertkrimen/otto"
)


var defaultVM = otto.New()
var defaultVMsetUp = false


type EntityVM struct {
    vm *otto.Otto
}

func (self *EntityVM) setup() {
    self.vm.Set("load", func(call otto.FunctionCall) otto.Value {
        toImport := call.Argument(0).String()
        entity, err := ioutil.ReadFile("resources/entities/" + toImport + ".js")
        if err != nil {
            panic("Could not open entity '" + toImport + "'")
        }
        _, err = self.vm.Run(entity)
        if err != nil {
            log.Println("Error loading " + toImport + ":", err)
        }
        return otto.Value {}
    })
    self.vm.Set("log", func(call otto.FunctionCall) otto.Value {
        str := make([]string, len(call.ArgumentList))
        for i, arg := range call.ArgumentList {
            str[i] = arg.String()
        }
        log.Println(strings.Join(str, " "))
        return otto.Value {}
    })
}

func (self *EntityVM) Call(name string) string {
    value, err := self.vm.Run("JSON.stringify(trigger('" + name + "'))");
    if err != nil {
        log.Println("Entity JS error: ", err)
        return ""
    }
    return value.String()
}

func (self *EntityVM) Pass(name, args string) {
    _, err := self.vm.Run("trigger('" + name + "', " + args + ")");
    if err != nil {
        log.Println("Entity error when triggering " + name + "(" + args + "): ", err)
    }
}


// TODO: convert this to use channels to prevent race conditions
func GetFreshEntityVM() *EntityVM {

    if !defaultVMsetUp {
        framework, err := ioutil.ReadFile("resources/entities/framework.js")
        if err != nil {
            panic("Could not open entity framework file")
        }

        _, entErr := defaultVM.Run(framework)
        if entErr != nil {
            log.Println(entErr)
        }
    }

    return &EntityVM {
        defaultVM.Copy(),
    }
}


// TODO: convert this to use channels to prevent race conditions
func GetEntityVM(entityName string) *EntityVM {
    entity, err := ioutil.ReadFile("resources/entities/all/" + entityName + ".js")
    if err != nil {
        panic("Could not open entity '" + entityName + "'")
    }

    vm := GetFreshEntityVM()
    vm.setup();
    vm.vm.Set("type", entityName);
    _, entErr := vm.vm.Run(entity)
    if entErr != nil {
        log.Println(entErr)
    }

    return vm
}
