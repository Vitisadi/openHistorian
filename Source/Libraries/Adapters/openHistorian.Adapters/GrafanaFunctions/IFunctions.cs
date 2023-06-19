using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace openHistorian.Adapters.GrafanaFunctions
{
    internal interface IFunctions
    {
        string Regex { get; }
        string Name { get; }
        string Description { get; }
        List<IParameter> Parameters { get; }
        void Compute(List<object> values);
    }

    internal interface IParameter
    {
        Type Default { get; set; }
        string Description { get; set; }
        bool Required { get; set; }
        public Type Type { get; }
    }
}
