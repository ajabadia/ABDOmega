#include <juce_core/juce_core.h>
#include <iostream>
#include <fstream>

juce::DynamicObject* createStringProp(const juce::String& desc)
{
    auto p = new juce::DynamicObject();
    p->setProperty("type", "string");
    p->setProperty("description", desc);
    return p;
}

juce::DynamicObject* createNumProp(const juce::String& desc = "")
{
    auto p = new juce::DynamicObject();
    p->setProperty("type", "number");
    if (desc.isNotEmpty()) p->setProperty("description", desc);
    return p;
}

int main(int argc, char* argv[])
{
    juce::StringArray args;
    for (int i = 1; i < argc; ++i)
        args.add(argv[i]);

    juce::String outputPath = "";
    for (int i = 0; i < args.size(); ++i)
    {
        if (args[i] == "--output" && i + 1 < args.size())
            outputPath = args[i + 1];
    }

    auto schema = std::make_unique<juce::DynamicObject>();
    schema->setProperty("$schema", "http://json-schema.org/draft-07/schema#");
    schema->setProperty("$id", "https://omega-synth.dev/schema/module-schema-6.2.json");
    schema->setProperty("title", "OMEGA Aseptic Module Contract (Era 6.2)");
    schema->setProperty("type", "object");

    // Aseptic Traceability Metadata (VEM-170)
    auto metadata = new juce::DynamicObject();
    metadata->setProperty("generator", "OMEGA Aseptic Schema Tool");
    metadata->setProperty("engine_version", "6.2.0");
    metadata->setProperty("generated_at", juce::Time::getCurrentTime().toISO8601(true));
    schema->setProperty("_metadata", juce::var(metadata));

    juce::Array<juce::var> requiredRoot;
    requiredRoot.add("id");
    requiredRoot.add("name");
    requiredRoot.add("description");
    requiredRoot.add("modelId");
    requiredRoot.add("implementationId");
    requiredRoot.add("engine");
    requiredRoot.add("family");
    requiredRoot.add("version");
    requiredRoot.add("registry");
    requiredRoot.add("tags");
    schema->setProperty("required", requiredRoot);

    auto props = new juce::DynamicObject();
    props->setProperty("id", juce::var(createStringProp("Module unique identifier (snake_case)")));
    props->setProperty("name", juce::var(createStringProp("Display name")));
    props->setProperty("description", juce::var(createStringProp("Module purpose and short documentation")));
    props->setProperty("modelId", juce::var(createStringProp("Hardware reference or logical class (e.g. ACE-UTIL-MIDI-IN)")));
    
    auto implIdProp = new juce::DynamicObject();
    implIdProp->setProperty("type", "integer");
    implIdProp->setProperty("description", "Unique numeric identifier for engine binding");
    props->setProperty("implementationId", juce::var(implIdProp));

    auto engineProp = createStringProp("Core execution engine");
    juce::Array<juce::var> engines; engines.add("Modular"); engines.add("WASM");
    engineProp->setProperty("enum", engines);
    props->setProperty("engine", juce::var(engineProp));

    auto familyProp = createStringProp("Module category");
    juce::Array<juce::var> families;
    families.add("OSCILLATOR"); families.add("FILTER"); families.add("ENVELOPE");
    families.add("IO"); families.add("FX"); families.add("UTILITY");
    familyProp->setProperty("enum", families);
    props->setProperty("family", juce::var(familyProp));

    auto themeProp = createStringProp("Visual aesthetic style");
    juce::Array<juce::var> themes; themes.add("aseptic"); themes.add("industrial"); themes.add("classic");
    themeProp->setProperty("enum", themes);
    props->setProperty("theme", juce::var(themeProp));

    props->setProperty("version", juce::var(createStringProp("Version in semantic format (e.g. 6.2)")));

    auto tagsProp = new juce::DynamicObject();
    tagsProp->setProperty("type", "array");
    tagsProp->setProperty("items", juce::var(createStringProp("Classification tag")));
    props->setProperty("tags", juce::var(tagsProp));

    auto registryProp = new juce::DynamicObject();
    registryProp->setProperty("type", "array");
    
    auto items = new juce::DynamicObject();
    items->setProperty("type", "object");
    
    juce::Array<juce::var> requiredItems;
    requiredItems.add("id"); requiredItems.add("label"); requiredItems.add("type");
    requiredItems.add("roles"); requiredItems.add("front"); requiredItems.add("back");
    items->setProperty("required", requiredItems);

    auto itemProps = new juce::DynamicObject();
    itemProps->setProperty("id", juce::var(createStringProp("Item internal binding ID")));
    itemProps->setProperty("label", juce::var(createStringProp("UI Display Label")));
    
    auto typeProp = createStringProp("Data type");
    juce::Array<juce::var> types;
    types.add("int"); types.add("float"); types.add("bool"); types.add("audio"); 
    types.add("cv"); types.add("midi"); types.add("gate"); 
    types.add("list"); types.add("text"); types.add("voltage");
    typeProp->setProperty("enum", types);
    itemProps->setProperty("type", juce::var(typeProp));

    itemProps->setProperty("front", juce::var(new juce::DynamicObject()));
    itemProps->setProperty("back", juce::var(new juce::DynamicObject()));
    ((juce::DynamicObject*)itemProps->getProperty("front").getDynamicObject())->setProperty("type", "boolean");
    ((juce::DynamicObject*)itemProps->getProperty("back").getDynamicObject())->setProperty("type", "boolean");

    auto rolesProp = new juce::DynamicObject();
    rolesProp->setProperty("type", "array");
    auto roleItems = new juce::DynamicObject();
    roleItems->setProperty("type", "string");
    juce::Array<juce::var> roles;
    roles.add("control"); roles.add("stream"); roles.add("input"); roles.add("output"); 
    roles.add("mod_source"); roles.add("mod_target"); roles.add("telemetry"); 
    roleItems->setProperty("enum", roles);
    rolesProp->setProperty("items", juce::var(roleItems));
    itemProps->setProperty("roles", juce::var(rolesProp));

    auto rangeProp = new juce::DynamicObject();
    rangeProp->setProperty("type", "object");
    auto rangeSubProps = new juce::DynamicObject();
    rangeSubProps->setProperty("min", juce::var(createNumProp()));
    rangeSubProps->setProperty("max", juce::var(createNumProp()));
    rangeSubProps->setProperty("default", juce::var(createNumProp()));
    rangeProp->setProperty("properties", juce::var(rangeSubProps));
    itemProps->setProperty("range", juce::var(rangeProp));

    // Presentation Object (VEM-493)
    auto presProp = new juce::DynamicObject();
    presProp->setProperty("type", "object");
    auto presSubProps = new juce::DynamicObject();
    presSubProps->setProperty("tab", juce::var(createStringProp("Visibility Tab")));
    presSubProps->setProperty("group", juce::var(createStringProp("Logical Group")));
    
    auto orderProp = new juce::DynamicObject();
    orderProp->setProperty("type", "integer");
    presSubProps->setProperty("order", juce::var(orderProp));

    // UI Object
    auto uiProp = new juce::DynamicObject();
    uiProp->setProperty("type", "object");
    auto uiSubProps = new juce::DynamicObject();
    
    auto componentProp = createStringProp("Visual component type");
    juce::Array<juce::var> components;
    components.add("knob"); components.add("slider_v"); components.add("slider_h");
    components.add("switch"); components.add("port"); components.add("display");
    components.add("led"); components.add("button");
    componentProp->setProperty("enum", components);
    uiSubProps->setProperty("component", juce::var(componentProp));
    uiSubProps->setProperty("variant", juce::var(createStringProp("Semantic variant (A, B, C...)")));
    
    auto sizeProp = createStringProp("Visual size class");
    juce::Array<juce::var> sizes; sizes.add("mini"); sizes.add("small"); sizes.add("medium"); sizes.add("large"); sizes.add("xl");
    sizeProp->setProperty("enum", sizes);
    uiSubProps->setProperty("size", juce::var(sizeProp));
    
    uiProp->setProperty("properties", juce::var(uiSubProps));
    presSubProps->setProperty("ui", juce::var(uiProp));

    // Attachments (VEM-58)
    auto attachProp = new juce::DynamicObject();
    attachProp->setProperty("type", "array");
    auto attachItem = new juce::DynamicObject();
    attachItem->setProperty("type", "object");
    auto attachItemProps = new juce::DynamicObject();
    
    auto attachType = createStringProp("Attachment type");
    juce::Array<juce::var> aTypes; aTypes.add("led"); aTypes.add("display"); aTypes.add("label");
    attachType->setProperty("enum", aTypes);
    attachItemProps->setProperty("type", juce::var(attachType));
    
    auto attachPos = createStringProp("Zones position");
    juce::Array<juce::var> aPos; aPos.add("top"); aPos.add("bottom"); aPos.add("left"); aPos.add("right");
    attachPos->setProperty("enum", aPos);
    attachItemProps->setProperty("position", juce::var(attachPos));
    
    attachItemProps->setProperty("role", juce::var(createStringProp("Attachment role (e.g. activity)")));
    attachItemProps->setProperty("unit", juce::var(createStringProp("Display unit")));
    
    attachItem->setProperty("properties", juce::var(attachItemProps));
    attachProp->setProperty("items", juce::var(attachItem));
    presSubProps->setProperty("attachments", juce::var(attachProp));

    presProp->setProperty("properties", juce::var(presSubProps));
    itemProps->setProperty("presentation", juce::var(presProp));

    items->setProperty("properties", juce::var(itemProps));
    registryProp->setProperty("items", juce::var(items));
    props->setProperty("registry", juce::var(registryProp));

    schema->setProperty("properties", juce::var(props));
    schema->setProperty("additionalProperties", false);

    juce::String jsonResult = juce::JSON::toString(juce::var(schema.get()), false);

    if (outputPath.isNotEmpty())
    {
        std::ofstream file(outputPath.toStdString());
        file << jsonResult.toStdString();
        file.close();
        std::cout << "[SUCCESS] Schema generated at: " << outputPath << std::endl;
    }
    else
    {
        std::cout << jsonResult << std::endl;
    }

    return 0;
}
