using System;
using System.IO;
using System.Linq;
using SenseNet.ApplicationModel;
using SenseNet.ContentRepository;
using SenseNet.ContentRepository.Schema;

namespace SnMagazine.Editorial;

public static class EditorialSchemaOperations
{
    // Fixed embedded definitions only. The native installer deliberately
    // preserves XML type names, independently of site content naming rules.
    // There is no arbitrary XML, file path, target path or handler parameter.
    [ODataAction(Category = "Editorial local pilot")]
    [ContentTypes(N.CT.PortalRoot)]
    [AllowedRoles(N.R.Administrators)]
    public static object InstallEditorialSchema(Content content)
    {
        if (content.Path != "/Root") throw new InvalidOperationException("Editorial schema install requires repository root.");
        var names = new[] { "EditorialItem", "EditorialCollection", "EditorialMembership", "EditorialAnnotation", "WidgetMagazineSource" };
        var assembly = typeof(EditorialSchemaOperations).Assembly;
        var definitions = names.Select(name =>
        {
            using var resource = assembly.GetManifestResourceStream("EditorialSchema." + name + ".xml")
                ?? throw new InvalidOperationException("Embedded editorial schema is missing.");
            using var reader = new StreamReader(resource);
            return reader.ReadToEnd();
        }).ToArray();
        ContentTypeInstaller.InstallContentType(definitions);
        return names.Select(name =>
        {
            var type = ContentType.GetByName(name);
            return new { type.Id, type.Name, type.Path, type.HandlerName };
        }).ToArray();
    }
}
