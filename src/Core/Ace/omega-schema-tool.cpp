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

juce::DynamicObject* createNumProp()
{
    auto p = new juce::DynamicObject();
    p->setProperty("type", "number");
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
    schema->setProperty("$id", "https://omega-synth.dev/schema/module-schema-6.1.json");
    schema->setProperty("title", "OMEGA Aseptic Module Contract (Era 6.1)");
    schema->setProperty("type", "object");

    // Aseptic Traceability Metadata (VEM-170)
    auto metadata = new juce::DynamicObject();
    metadata->setProperty("generator", "OMEGA Aseptic Schema Tool");
    metadata->setProperty("engine_version", "6.1.0");
    
    juce::String buildNo = "unknown";
    juce::File buildFile = juce::File::getCurrentWorkingDirectory().getChildFile("build_no.txt");
    if (buildFile.existsAsFile())
        buildNo = buildFile.loadFileAsString().trim();
    
    metadata->setProperty("build_id", buildNo);
    metadata->setProperty("generated_at", juce::Time::getCurrentTime().toISO8601(true));
    schema->setProperty("_metadata", juce::var(metadata));

    juce::Array<juce::var> requiredRoot;
    requiredRoot.add("id");
    requiredRoot.add("name");
    requiredRoot.add("family");
    requiredRoot.add("version");
    requiredRoot.add("registry");
    schema->setProperty("required", requiredRoot);

    auto props = new juce::DynamicObject();
    props->setProperty("id", juce::var(createStringProp("Module unique identifier (kebab-case)")));
    props->setProperty("name", juce::var(createStringProp("Display name")));
    
    auto familyProp = createStringProp("Module category");
    juce::Array<juce::var> families;
    families.add("OSCILLATOR");
    families.add("FILTER");
    families.add("ENVELOPE");
    families.add("IO");
    families.add("FX");
    familyProp->setProperty("enum", families);
    props->setProperty("family", juce::var(familyProp));

    props->setProperty("version", juce::var(createStringProp("Version in semantic format (e.g. 6.1)")));

    auto registryProp = new juce::DynamicObject();
    registryProp->setProperty("type", "array");
    
    auto items = new juce::DynamicObject();
    items->setProperty("type", "object");
    
    juce::Array<juce::var> requiredItems;
    requiredItems.add("id");
    requiredItems.add("type");
    requiredItems.add("roles");
    items->setProperty("required", requiredItems);

    auto itemProps = new juce::DynamicObject();
    itemProps->setProperty("id", juce::var(createStringProp("Item internal binding ID")));
    
    auto typeProp = createStringProp("Data type");
    juce::Array<juce::var> types;
    types.add("int"); types.add("float"); types.add("bool"); types.add("audio"); types.add("cv");
    typeProp->setProperty("enum", types);
    itemProps->setProperty("type", juce::var(typeProp));

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
